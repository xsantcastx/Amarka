// Simple script to set a user as admin in Firestore
// Usage: node set-admin.js <email>

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setUserAsAdmin(email) {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${userRecord.email} (UID: ${userRecord.uid})`);
    
    // Update user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      role: 'admin',
      email: userRecord.email,
      displayName: userRecord.displayName || email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`✓ Successfully set ${email} as admin!`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address');
  console.log('Usage: node set-admin.js <email>');
  process.exit(1);
}

setUserAsAdmin(email);
