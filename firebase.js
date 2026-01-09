const admin = require('firebase-admin');


const serviceAccount = {
  "type": "service_account",
  "project_id": "dubaimobiles-55807",
  "private_key_id": "ccd527fa78ace2fb67e9291df34df3f765ce6d4e",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQChuItvr4iNNcpS\nPDiMI84UnXM/CYerjHO9BsI1aArjope1gtNJiU0O89/Ykb/DFPjodTESjclbCN5t\nBh295F+Fsx+wZDlPREVyrdOj9ZfS0wcgu8F3VDggHiTdNdSqDl+AP+roq3JDa8MD\nWUFDzraitRTKhM8nEZYNkMIh70U49YlWrKxqhPoXAgGKPZ1h4g9E2Ydz2m790DTH\nsakS/oP73BSBz7Kch9v8/4IMIlesTgmj0Af9MVnfrv4gq7/CM7RSJ7Q/yzKTN+NS\nkPNDVmT/GXRcXbPgDK0vMXJ2KbihvPEHkGsrQcRu8IH9XNan2EWsV1bRVglPJNnO\n906On0HbAgMBAAECggEADpyvkJhSJLwq+zIww8zKZodxbc0tIn1uybIOIygy7611\nurNG5vqOaV70p0tIAdbnxI0uMWh5PI35Fu26CznSvbBZGSV9HiHjioCVQlfC74wc\ntULxsJf9+DzxBMHD5Nemnl5oGby/9sKKXMeYQ4mua9Yjuka0tul6XuBpAgrt/L7h\n8TAlfbhmj3Oigk5icd7m3cM26IF6EaZ0UsLizrw/l8gYSzbFF0inwZPH+fKIL8xI\n3SWwtnDw54a2YodBr2uTDMe7C8LlPpJoWkbUaCz2IFVF3eHk2u+7kx61SrNNA3ha\nzLRPCYY8B9unnsgHubvleU8JHKbsb3OgHLo5+WjraQKBgQDQ5Y2WbMweQ3R00kfL\nbkx+rhV8pDf2CaT+7l8Vh6RNltjsotlV8Iql/EA7vNaS9P8CgHSbuRVmJVJigGeR\nAHJDmm6jq2YcFvxim32egOWJix7pR4oQawCavUoopCMK+6yCeUEdPiny/qVTcgXI\nnQq7GMS6A0BHJws+LOup9A2jswKBgQDGL8sqDoA735AlM5DiLJe3Vu4I9tRnDNTx\nA4ekGNlox8/FWlKr3v4YcY9qCAb1XBb96TUU+XC8vOhLl7jK4fPULgmdMWrFyysD\nT9m83NcAiJrXCKVC+Fb+PX5jlz9u3RrGOnpJ2RCTB2HsRZ8Z5eYcIXXua2JXNJHm\nJnOLBqd1OQKBgDgjOGWQX1pSrl0mlXyp64yvo76XMyK/fMO1s3/Jr/HZ8/nD2bwq\npFfu7iQfn1pm1JELjEq89m844GbwMuTYxdw9CDabvRkXZEPrnVqXMRhBdtEiFIxM\n9SCgdeluEqzE7ZsykrkVF5jhrfQ61CsRaOzWvydt8Dwu1eqjj8FggLnZAoGAejkF\nYVV6DfKs8dRgWKvJkP7iY9LdYQQP2ucjYrcUdUMsxngSnf4y1B5MpMZ4jB6T61lE\nLEA9H5ic5emWxEAe4E7YDQJp57uJNkyraocDbUfRviWNzcRb2gVQidi//P4Mwg1U\nV3CvgQ0/fbfeC9m1VMnp8fR1vHQmOjqibS3YXjkCgYAG+gxOrmbDeb4dKoHvXPRH\nX4WQu9FIBRefD9fGY47Eap4H+JDXPE1KPjW5O9f4vbAvfccA/3G2nDsCEgzoYJSQ\nYdTImnIgieFdoMuM8c2VJLNqymh+n5VSg8cOU2Az4FqdnKVsVWIAGc/AP32yEGpX\n1AJIcwaeMAKAAew8+8tgMQ==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@dubaimobiles-55807.iam.gserviceaccount.com",
  "client_id": "100378241896291532294",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dubaimobiles-55807.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};


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

