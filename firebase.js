// import admin from "firebase-admin";
// import fs from "fs";


const admin = require("firebase-admin");
const fs = require("fs");


const serviceAccount = JSON.parse(
  fs.readFileSync("inspirezest-a9575-firebase-adminsdk-fbsvc-8399478bcb.json", "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}





const db = admin.firestore();
// export { admin };




module.exports = {
  admin,
  db,
  // auth,
  // storage,
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp
};