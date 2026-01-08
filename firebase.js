// import admin from "firebase-admin";
// import fs from "fs";


const admin = require("firebase-admin");
// const fs = require("fs");


const serviceAccount = 
{
  "type": "service_account",
  "project_id": "dubaimobiles-55807",
  "private_key_id": "a3180686a0541390ea8fb4ae7c35e1e381a5a634",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDLrf1MgNjDHphx\nFVDOpnfxUw5FW1keiDUmWhSbKPkLwNYh0OJ2NlFd+xR7VJaTJUS+Cn4csYXBGKve\nlMpnpKtKPU/kXKb0OOWr62+PapIck/mCrbajYTZDZi6gbG4c7gQCNAYyZ97Qp2ex\nomxHl0nXDSQ1K2nRjH6Ih12wgEEwtk26sXvoUk1OvW+mIq1lx7++AdvQl8h5z0gg\nZuVO2wjrbIrwNs5IgDbWkts/EfszErZnOOjM9n6a/opXwsGPhgpHon133qBc2jq6\nd8zqKCzFnXWJElUdG1pKIcwjnLZEg+7LV9rRLhnmGASwhwTcG5x0vFDo7WQphUUR\n8KhiqVUrAgMBAAECggEACwxmGBdJKtRnCoNQfdUz3mhV9tcsr2ZOE8WBJqWDVOrh\n8rWlAyqRIVr0UnhVLqgv4WsqSh4rFj1jXVCO5i5diEppIgcQm2DWvIup4oqyYFB6\nkWcg6B3m1qMdVmBrXLBgkUoHKAbQZFsgWddorj17qOmylBvFwrMvTfKh12gtoRm5\nswi8y9V5Qma9+JkiomAlfRTpJ2MQ8c+RSP4TvPbadUgLqln2T27LPWLMzn7kLpk8\nVV3+Xwvi+3WdmS8s7zFYDWp7G9/DAeixyPDsEDS830IorHMklxVXtixMGGC9TBTm\nXviDVNbQbEyfbjZGTky9rx/99xFj9E56XVeBU0vtGQKBgQDvEy9HrbwZFztlLxte\nYQ4+PKcjxH5Xs0wAKjysASstkfbu7f2z5ywLbUUeAHw4zvWenm/jEfERUvIeV1Mw\nUl+tVDS9gD+zDxTnf97QboIpYfaBFEKAiWnq4N0gRSZVGLD19VTWk59pyMXHj6Ko\nRJ6hlDNuoPNljwi/eSL7kLOQjQKBgQDaGVOybGYqbqsh6oblV1ZbLcrlP7cxfIU3\n70w7iGfQrpzJkC8eKxjIq8RmYKsGn1lMmN/L+YIl9yMHfQgUIPkxwu0+dyl8MqTe\nva3ehGBM/Ct144Gfj3MEJjmiYwwK17NmA6zejZ+XeoAhIMTtb+DuyfJNSRpl47DT\nYcvTpgPalwKBgBayjZSSi/8d04fBtyl4sW97NqsQpqYQ4bBKUkRKQB0tdHIuqh2A\nXxAeqac1iJWkIHGUvS6jr21joJT82WsHBwpfqjoriOCpF+T6oN7M/xKKuGp8z+uA\nIEwqWRQNPJxrobFYP1u33DSg2RYfLuQmz6Crf06LfVAxCjWTfJzBmiqpAoGAQsYY\nUvtPOFSTvpmQXW0k+luF0DR2wQbvvpVcUKnNpx2e0TN8yY7GUsIMKpAULL3i2EnB\n0zB8AWWt6uAD9i22Pd8BReuz3tuekLegIQ2Ecm2OXNSf3htMSovtf2M1z6gEvAoK\nBkV0BCu0SPBAerWTN2jK75CfLWzNuZoqjo04htcCgYAogMP2SbEQMKLz4yBGXNlY\nwnoMmupvz0hYHzLFZ2+wq+ELIqMb/kuXyk8Hbm+H3gw/nSHJNhKDsR8iQt5jFok4\neW8a8/8jwz6nxcjjEA2oqdU7MWWVCMzfBIPyergKyQuWedeDyED5/v5jeBT0AwTd\nH0HrCm+FJCSgADfJwNZKUQ==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@dubaimobiles-55807.iam.gserviceaccount.com",
  "client_id": "100378241896291532294",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dubaimobiles-55807.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};



// JSON.parse(
//   fs.readFileSync("inspirezest-a9575-firebase-adminsdk-fbsvc-8399478bcb.json", "utf8")
// );


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