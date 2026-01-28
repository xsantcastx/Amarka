[Error] Failed to load resource: The network connection was lost. (channel, line 0)
[Warning] [2026-01-28T19:37:42.833Z]  @firebase/firestore: – "Firestore (11.10.0): WebChannelConnection" – "RPC 'Listen' stream 0x1e9b1868 transport errored. Name:" – undefined – "Message:" – undefined (chunk-YFDX5PGP.js, line 1264)
[Error] [2026-01-28T19:37:42.833Z]  @firebase/firestore: – "Firestore (11.10.0): Could not reach Cloud Firestore backend. Connection failed 1 times. Most recent error: FirebaseError…"
"Firestore (11.10.0): Could not reach Cloud Firestore backend. Connection failed 1 times. Most recent error: FirebaseError: [code=unavailable]: The operation could not be completed
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend."
	defaultLogHandler (chunk-YFDX5PGP.js:1264)
	error (chunk-YFDX5PGP.js:1332)
	__PRIVATE_logError (@angular_fire_firestore.js:2675)
	ca (@angular_fire_firestore.js:13249)
	la (@angular_fire_firestore.js:13226)
	__PRIVATE_onWatchStreamClose (@angular_fire_firestore.js:13383)
	__PRIVATE_onWatchStreamClose (@angular_fire_firestore.js:13381)
	close (@angular_fire_firestore.js:12991)
	close (@angular_fire_firestore.js:12972)
	(anonymous function) (@angular_fire_firestore.js:16135)
	(anonymous function) (@angular_fire_firestore.js:16166)
[Error] Error checking admin status: – FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
	isUserAdmin (chunk-DPTNDSFY.js:89)
[Error] ERROR – FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
	handleError (chunk-WDXBREQW.js:2751)
	(anonymous function) (chunk-DNPRBR5S.js:19412)
	(anonymous function) (chunk-DNPRBR5S.js:19405)
	rejectionListener (chunk-WDXBREQW.js:2788)
[Error] Error getting settings: – FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
	fetchSettings (chunk-DPTNDSFY.js:69)
[Error] ERROR – FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
	handleError (chunk-WDXBREQW.js:2751)
	(anonymous function) (chunk-DNPRBR5S.js:19412)
	(anonymous function) (chunk-DNPRBR5S.js:19405)
	errorListener (chunk-WDXBREQW.js:2793)
[Error] ERROR
FirebaseError: [code=unavailable]: Failed to get document because the client is offline.
next — index.esm2017.js:18469
(anonymous function) — index.esm2017.js:17826
	handleError (chunk-WDXBREQW.js:2751)
	(anonymous function) (chunk-DNPRBR5S.js:19412)
	(anonymous function) (chunk-DNPRBR5S.js:19405)
	errorListener (chunk-WDXBREQW.js:2793)