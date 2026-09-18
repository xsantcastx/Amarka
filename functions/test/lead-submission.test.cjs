const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { escapeLeadHtml, validLeadUploadPath, validEnquiry } = require('../lib/lead-validation');

// Load the real callable handler against in-memory Firestore/Storage and a
// fake provider. No credentials, production writes or external email requests.
const docs = new Map();
let messages = [];
let emailResult = 'accepted';
const snapshot = ref => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) });
const db = {
  collection: name => ({ doc: (id = 'generated') => {
    const ref = { id, path: `${name}/${id}` };
    ref.get = async () => snapshot(ref);
    ref.update = async data => docs.set(ref.path, { ...docs.get(ref.path), ...data });
    return ref;
  }}),
  runTransaction: async callback => callback({
    get: async ref => snapshot(ref),
    create: (ref, data) => { assert.equal(docs.has(ref.path), false); docs.set(ref.path, data); },
    set: (ref, data) => docs.set(ref.path, data),
    update: (ref, data) => docs.set(ref.path, { ...docs.get(ref.path), ...data }),
  }),
};
const firestore = Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'now' } });
const registration = new Proxy(function () {}, {
  get: (_, key) => key === 'HttpsError' ? class extends Error {} : registration,
  apply: (_, __, args) => typeof args[0] === 'function' ? args[0] : registration,
});
const functionsMock = {
  runWith: () => functionsMock,
  https: registration,
  firestore: registration,
  auth: registration,
  pubsub: registration,
  logger: { warn() {}, error() {}, info() {} },
  config: () => ({ brevo: { api_key: 'test-only' } }),
};
const originalLoad = Module._load;
Module._load = function (request, ...args) {
  if (request === 'firebase-functions') return functionsMock;
  if (request === 'firebase-admin') return {
    initializeApp() {}, firestore,
    storage: () => ({ bucket: () => ({ file: () => ({
      getMetadata: async () => [{ size: 123, contentType: 'image/png' }],
      getSignedUrl: async () => ['https://example.invalid/test-artwork'],
    }) }) }),
  };
  if (request === './lib/guard') return { withFlag: (_, handler) => handler };
  if (request === 'dotenv') return { config() {} };
  return originalLoad.call(this, request, ...args);
};
const { submitStudioEnquiry } = require('../lib/index');
Module._load = originalLoad;
global.fetch = async (_, options) => {
  messages.push(JSON.parse(options.body));
  if (emailResult === 'network-error') throw new Error('offline');
  return { ok: emailResult === 'accepted', status: 503, text: async () => 'test failure' };
};
const payload = () => ({
  submissionId: '10000000-0000-4000-8000-000000000000',
  type: 'standard', fullName: '<b>Ada</b>', email: 'ada@example.invalid', role: 'other',
  projectType: 'Engraving', projectDescription: 'Please quote this engraved logo for our event.',
  preferredMaterial: 'Metal', estimatedQuantity: '25', targetTimeline: 'October',
  fileUploads: [{ id: 'logo', storagePath: 'private/enquiries/logo.png', originalName: '<logo>.png', size: 1, mimeType: 'image/png' }],
  sourcePage: '/enquire', leadTags: ['standard'],
});
const reset = () => { docs.clear(); messages = []; emailResult = 'accepted'; };

test('submission preserves fields, verifies bytes, escapes HTML and does not duplicate a retry', async () => {
  reset();
  const result = await submitStudioEnquiry(payload(), {});
  assert.equal(result.ok, true);
  const lead = docs.get(`enquiries/${result.id}`);
  assert.equal(lead.preferredMaterial, 'Metal');
  assert.equal(lead.fileUploads[0].size, 123);
  assert.deepEqual(lead.emailDelivery, { notification: 'accepted', acknowledgement: 'accepted' });
  assert.match(messages[0].htmlContent, /&lt;b&gt;Ada&lt;\/b&gt;/);
  assert.match(messages[0].htmlContent, /October/);
  await submitStudioEnquiry(payload(), {});
  assert.equal(messages.length, 2);
  assert.equal([...docs.keys()].filter(key => key.startsWith('enquiries/')).length, 1);
});

test('rejects changed content when a submission id has already been saved', async () => {
  reset();
  const first = payload();
  await submitStudioEnquiry(first, {});
  const savedPath = `enquiries/${first.submissionId}`;
  const savedDescription = docs.get(savedPath).projectDescription;

  await assert.rejects(
    submitStudioEnquiry({ ...first, projectDescription: 'This changed request must not overwrite the saved enquiry.' }, {}),
    /already-exists/
  );

  assert.equal(docs.get(savedPath).projectDescription, savedDescription);
  assert.equal(messages.length, 2);
  assert.equal([...docs.keys()].filter(key => key.startsWith('enquiries/')).length, 1);
});

test('provider rejection and network failure preserve the saved lead with failed delivery status', async () => {
  for (const failure of ['rejected', 'network-error']) {
    reset(); emailResult = failure;
    const result = await submitStudioEnquiry(payload(), {});
    assert.equal(result.ok, true);
    assert.deepEqual(docs.get(`enquiries/${result.id}`).emailDelivery, { notification: 'failed', acknowledgement: 'failed' });
  }
});

test('rejects malformed required data and arbitrary private attachment paths', async () => {
  reset();
  assert.equal(validEnquiry({ ...payload(), fullName: '  ' }), false);
  assert.equal(validEnquiry({ ...payload(), email: 'not-an-email' }), false);
  assert.equal(validEnquiry({ ...payload(), submissionId: '../elsewhere' }), false);
  assert.equal(validEnquiry({ ...payload(), type: 'trade' }), false);
  for (const path of ['private/secret.pdf', 'private/enquiries/../logo.png', 'private/enquiries/script.exe', 'private/trade-applications/logo.png']) {
    assert.equal(validLeadUploadPath(path), false);
    await assert.rejects(submitStudioEnquiry({ ...payload(), fileUploads: [{ storagePath: path }] }, {}));
  }
  assert.equal([...docs.keys()].filter(key => key.startsWith('enquiries/')).length, 0);
  assert.equal(escapeLeadHtml('<img src="x">'), '&lt;img src=&quot;x&quot;&gt;');
});
