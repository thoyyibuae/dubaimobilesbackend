// import admin from "firebase-admin";
// import fs from "fs";


const admin = require("firebase-admin");
// const fs = require("fs");


const serviceAccount = 
{
  "type": "service_account",
  "project_id": "dubaimobiles-55807",
  "private_key_id": "13934a7c603f4a722deea293950f14d7761d3202",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDYZ185+pB3X8No\nt67p+LAZ3Y/Wotm3QK/4u0PEo7qOstqMkIvj6qJKYI5WLTd4zJxZVV/fmYwg4S00\nhy7/vTMtS9p0Sys3xR4DjJNi+J5ScBpUkT+XjQvUUF/Zw6J2rd+ugWUB3a4nWjET\nAMRy9Z1HVkrm4nJraceXlJDYkJca5cLgvp5enIiNcM8cOMS8OqGAz39kdvVJ2kqA\n+IqpNNxIQgB+wgmlW+gyGDKeEfc+p+ib/OzZCqYMaP7qrudfFEOJvdWw3N0g2vcS\nQpxTyV4EvBys88Pc2JCiixlwnytoY9uLU5lXZiWdHeKYD2FQINw/UQwsD9TWfHVB\nBzGAjzlZAgMBAAECggEAN3GstTccQml3sGG3X9zGian5i11n+IqLS2f3Qe9NAfiT\nBAaYwMlB0VqRvUSSfNG3kS/Ng4VcoKPwqA+mnAFGlmljy/3iUcSgHvqqXGYkciyk\nolwgddy+ViRNmoaEHnIH6DbgwSyhzRVPk3XT3zxMkpVqVWNZO2n7qDt5LPNGs64H\nYmgDsKgYLy6UUm0OCwAZK0/q8+hIjA4oWYrVhEVeK/E0r49sgeZdRWZtk8OchAnH\n9M4o8jhDAuXPQSdMQAUGwpSYnaMH+/VKfUD26sugAwxDewDipLuXAR2gHJQxfuK1\nCzNxvyWLtGbqOqXei9wRX6YFsHAQmwWMSwdeBGQyvQKBgQD9dvQXCA90XRtwaEI/\nVx+kMKpGZVhznbniz5sI/wedkMcri6VJAdzLF16FIHxvehKNpz7P+YyGYqDDRsl5\nKmmGbnCSQJ8iuSSoJBDxEq9KXTaSpR9Blc4axAOEcBrqmtda/O94zd72GIntP2ip\n/KR//TTy9k2H/Gs8N+j7IKNLqwKBgQDakYRNi2XeLqzcTTZxBmyKB6ICXzKQTbnp\n2tEp68CvUiW7nSrel7aPzj1IphsVVbVEDBU37emXUD5b011Z+BbeWXh7zOH/Rczd\nsCpRUfyITvt90HM6VhHzShzmhUqqt66/ETojwqqmk6WmUPsZ6Z8iMIZYM1atGaRQ\nXm0QvD/rCwKBgQDESpUqKQHe+iQ/314+s3g7rbyQm/fuQd4tet30D52UNwUoAhPV\nAG4/ki+PJeN4aa9oqHcKlZZwlH0v/egVv/TNOUZQ3V7gg0WSOawtJm0+SAX1d49H\nOX7OV7Lpo/AUdCoHuw6yHa1oJQTcCVlDG/dBb5TL/Fd60s8xaZMyuMn91QKBgCZA\nvZUMxqFiLeLIqLSTWT+3IkWj/6d90wH4yA68Mhb9G5mAYlZe2xbEE7m5SJgtTfJA\n4x3Mx8sxwhg0H+x1HRuBMTMJoqwYvUg3YtCktrvshtt4NhKJqc6YtAIsZesHBtBt\n5W0IzvEkeiNnnOrmFnHXaEvbgFn/WOCwBgqdx9oNAoGBAIK3DJtaSOWoJL4bxyyn\nskoesfucDrbCgfDZLYmmsmNcEzvrj4Uw4ocnmBsI5KdPPk1sRLiG9lP7Wf3LK6+u\n9kiwoNTMhVbz3Fs68ilkyalUSjPR1ebI90amX2PaZhSVILSxp1ELHl1RvFGEXk0F\n3QkgrghWqp31QLA4+u+6SWFq\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@dubaimobiles-55807.iam.gserviceaccount.com",
  "client_id": "100378241896291532294",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dubaimobiles-55807.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};


// {
//   "type": "service_account",
//   "project_id": "inspirezest-a9575",
//   "private_key_id": "8399478bcb9f76ac6389f26e281fdb69d2049d52",
//   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCiTTpw0jckw4H8\nigaM/9RZcKemSiYC7l0OdRoQ5Zbq9zwac7+S8WcCBqyfv2JyvadldeeCmHW/kOaq\n8sWeblNyZ5uDR1qZQJbhb93d3RrouJPEVyV/RxPvXH/I6DxufrEoO2E+unmcmCyL\nFzv1t3bHAi4wAtFycInuPLL5lGmyIgOw1yM1x7Aa7x3vXijtB4EizLnFJRzL/z3Y\nHf7U8xv8PXljlYwtd3f3xBQl7Os9u1Fv5vWKEUiDIOFFTiJy9XhrRScYGoOyHwUF\nWu0FeVXk1lyPluVvYZtUxe4XIBOovbrWNyZxRsEl9AGk9qfJOYiIy7teevwLW457\nSbzfqrnjAgMBAAECggEAMkmfe+mGcHurQOY7VWDHGNdQ+rMqx+m3J42c//NDKZZl\nJwUKLKtjcTtELVMNW+PrhAJeMxauFSb+caU7GfWxIVd81dY7+hQLK9qPcfjaJ5VZ\nI5Kk6aTKRnXwmf1rDAlxNrf/T4JTv/NeidIvH9kykkLYsMOOxdicxBZGlhIoFar5\ntfRajFZUlPAV+es3yfAQKbtQXb0YP1PL9z0MEsa7S0XqOTEqb1CiHxD8T2jYdOr/\nlCL/oEx1Q4M+PJDKM32P4anA2OLusbcLkbHmCLNoAxcxvscpesTHP4w9vC9BfPqw\nQZ+nq2UvCzLbaE+T26rctbitLOdlsWesKSVfaDsmEQKBgQDbW289UVjm9t4wps3Q\nKhKlVRedJGwKlbDgHNmOR1ReaSyJ1umvsyrlEix4CN3AXIEkDHUNUU6oe85tNPJE\nSym7C2WMvqwJr1d2MjM+L9Glhn99B0tbbiI154dlo/J/km/Bbe+CAbCLok4Qr6X6\nRmGcUSavdsY/d3w6aI5D+O/0HQKBgQC9aeEFU2O0f+nB9yHPrrYZYRdYX0x/tlFz\ngOirJz19Bqh6xLrxrUTQoAMhkUHMocuOZgJwIp8AwC+2GjRl2thUXfY2sdXcNkuj\nl44oLt64/EqO31ktPhyMyDLKzvIAWqIF2/a9IfD/+sligiY9d/eP0zllS3ixrMrC\nUxwv4soF/wKBgQCvBZaNY1G+/2yrfvwqwtcbyfhMbtox29xEBWDk8C72IY7i8HKG\nuTtZiRWoNNLSgDyeSb4/gQd00UwUwLEpIpvKXT6KfTyBgcEUUtumG7t4CgfA98f9\nzLNJNVJIG/cKKQo4WQJIRhbaYwdMswmI1w1dDzcBu5BU5X5ekDwrKf4zVQKBgQCW\nwG4XjwcL4cJqXgbLBIJqMJwj+bUo8DJje3WywshteZ8eFvWy4/ShFrlnPfTgqOUZ\nsJbAKM3kCxHuHW0Wo9cJTr9nSKKtYYlR6o157dPV5vZwP9L57zVJ1wyV3Z8+KORL\nRYZbgWgOU8t0W6GTyqd+EN7df/PPdXbqsrr8YcPogQKBgH3o6AYVStXp/mzuCCv1\nqfCEikK2pSTmIMdEa3tw6q+MWBOtMND7cBbJ5oRszYgQ83RNyWFvnlOx/0f+jNi6\ny8CVllOX8Z1YQ82chjj0i0mtH27BEAvNl854JROsrClnQGPPqZXCpzY3F9xjATch\nZlLNTF9QD/wDnfe+uSt7Uiwz\n-----END PRIVATE KEY-----\n",
//   "client_email": "firebase-adminsdk-fbsvc@inspirezest-a9575.iam.gserviceaccount.com",
//   "client_id": "110698633292102665843",
//   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//   "token_uri": "https://oauth2.googleapis.com/token",
//   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//   "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40inspirezest-a9575.iam.gserviceaccount.com",
//   "universe_domain": "googleapis.com"
// };


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