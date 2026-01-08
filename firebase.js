




const admin = require("firebase-admin");

// Direct service account configuration
const serviceAccount = {
  "type": "service_account",
  "project_id": "dubaimobiles-55807",
  "private_key_id": "07caebc6aabe11f29a965ce911d1303e26045e9c",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCMqDbNASx3hXu4\nByyTlq/30/2gLygD4/tEr7f9gf81V/Aiq/4mTQbl4bSV9PyEn7RoN3JG7mi11+2a\ndCx9gAefzx+tBwh028gyzEmC4kZeqxJCQUQV8KcQnj/htAhsjJldWiC7VJ/zAzNd\n+NKjNH4uD97ka20m5XZZ/fE4E7ek0EwbYo5UFoxCrvkf4jGhVnXLcKwT0l9sZ/QG\nvNNwpASYMHHnRgeC72KAUI6qjzeLO+zbjt5N2UnkCrMRkQZMlrN/6chsFoK6UOUJ\nsAdd9ZqZNQOlUeQM98JlAw+yLLFmrg8/XnLbSngGVjbfjjXKlmLgZtOhWhtDWbTn\nlTV3eJkVAgMBAAECggEADmwxMlQsexT02qnhqECLSp4yI3qyX7PA0Ao0k4oA4Tdj\nKCr6pHLBglDic33rZq35kbYdwagwlHTPqEbBSR0XqwtR9CwEcfcXUB4ia4lILezc\nsm5+zMEgYFPZuQr80iSYlTnooUzMGd76JWieMJ3xUkfOUx2w04wz1oZzdYyQCBYs\nzPd33Fva6DfFQI+DecELQ8Dcwkd5Td/eGN4cANZAvebSWvO/tO/+MmVrMJSRhaLv\nHVpXqxnImWlXVCyOYkhbPID1PEGo9bZ/4UA2uLKXBultMgsr73cLnC0lMsMGVnTe\nMct+8uYQJ9uMeAXrI5TsYPIhv6At3uHHbMUKkIOTAQKBgQC/Xi48QmNGHmSE7i9u\nd/pdfdzUFeN6AR9POyezt4pFpewQbQhkqYNfRAlu8YJMyppoin3yb9ny/jZO//oE\nGStfc82kikyWZQOrdyN5LaFk6FN7mOSa4LP9VEAPQB3AW/VNK/UYpk9BNwVEmNBK\nQQUG5j28LGoQxoasvxnhXSkBGwKBgQC8KYl4Usccifqz4HM31krWSq1smJdLAXyb\nUdKAEWVERhfgMN2I6xwLrYLy/8OxrZDg9A7myJvYmsjIIBII8ymYIPqM04HM93Sh\ngXqTVcPDWRefYg0O3Om/dP/m2V05NspB0m7PS/PIkLLqN2mvcS86OtOn2NN9HSR3\nwZtamI2hjwKBgEfMAfTBw5UvGe91nX4IrXoeGpfHjozblu+W9hJLLilrUuHmxltd\n7df0IsXo/kXpTX0jWJV4uYCdN6r0Bs061Db/r4uoB4v1YicWj8yK/h5pu8iHWF1z\nKJRG47HVEFR3K9VERLR20Q1aozNVUfBJ7KTmBQtwbmrU0PpGyGLxHM05AoGAQRuK\nUtUpyok/83/lvltrF81NRvdh2nVQPZpJYUEjrkUmu8+MyHS6BpxqZFT1zQRGzmAE\ny/x8WK3ubbkTJH+nU9mNeK8zCc5SUBQyasrRa0Xns6HE7PCp/TKp3aI27LY1tCLx\nbs9UMoFHN14nNqrOcbKrTDftriwoUzvt2qJQ16cCgYBWmtV9+dGqGkPvju6V4yze\n2s97boUVnxPqkQEntfMNJH/fU9+KiuYAL1BovltFl8ScTBQzcEzhKHrjRmHncQPw\nwAl6pQhCMnTJVlmmWy4mXvdyVyWYKwW3GfOvd7aMNArJMyqFuttRu0tgeWyZhM91\nkuwipCDoWfEa53siFrnq+g==\n-----END PRIVATE KEY-----\n",
  "client_email": "dubaimobiles@dubaimobiles-55807.iam.gserviceaccount.com",
  "client_id": "107267238546098096188",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/dubaimobiles%40dubaimobiles-55807.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message);
    throw error;
  }
}

const db = admin.firestore();


// Optional: Test connection
async function testConnection() {
  try {
    const collections = await db.listCollections();
    console.log(`✅ Firestore connected. Collections: ${collections.length}`);
    
  
    console.log("✅ Firebase Auth connected");
    
    return true;
  } catch (error) {
    console.error("❌ Firebase connection test failed:", error.message);
    return false;
  }
}

// Run connection test on startup
testConnection();


module.exports = {
  admin,
  db,

  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
  testConnection
};


