const admin = require('firebase-admin');

function loadServiceAccount() {
  // Priority: base64 env var -> local file

  


  try {
    // keep local file for development but DO NOT commit it
    // file name is ignored by .gitignore
    return require('./serviceAccountKey.json');
  } catch (e) {
    return null;
  }
}

const serviceAccount = loadServiceAccount();

if (!admin.apps.length) {
  if (!serviceAccount) {
    console.error('❌ Missing Firebase service account. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or provide serviceAccountKey.json (ignored by git).');
    throw new Error('Missing Firebase service account credentials');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('✅ Firebase Admin initialized successfully');
}

const db = admin.firestore();

module.exports = {
  admin,
  db,
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
};

