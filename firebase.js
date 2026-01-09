const admin = require("firebase-admin");

const serviceAccount = 
{
  "type": "service_account",
  "project_id": "dubaimobiles-55807",
  "private_key_id": "bfce14bad6d9a649f0b3e66568dffb080b19c9d3",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCll+o67fZeWWGY\nkFGB394LDUIpK9R5kueUwd5eD0biWmOpjsw0M35okDfTwgGojKJqEJRUKonMBH1V\na5mG3qU4EX8CXuJUif2YrsrKbAZhJb2bSR2BjgzcKqiq+e2JrRkEKDT9mh7Q2Cd7\nQKvoLDxBvBel5Z3XxnOHYr/IJipGyNXbgAEBVscWbNHQfZJ/hcu/zHYmckLbZ1De\nhtX4E6zwC1NscoCjlQaaoKaKQUSWbeBe/Lln396WjhWhKfrBqxQvnO+s+2kBnAfI\n/+UPe0RQ6OvfYqBbPCxUOXEZfqKNyheFPF1u13PgaNeckLbySbhUhaE+DwZiR2EI\nxGUfoivZAgMBAAECggEAUGpPs0JwTC03ufELw/hFSjSsFnZUfp2anKDxLdhZYf7n\nOyY/gHIpRvoSQmGKkKGLFdrrTVxDArKDcwIH0nk43tuQRERzwP4qCwWHMXn4NyEu\nzMRa8dlb4WdN9Yndkuhep6gm46j+ogj2U2J6mQsyT/HZwhSZ7HlRDUQlQjtWeHyz\nWGBu45RahG6iy1NFg51RfVVNYpt383pcRbU3F69LMdERxnAHjp7AwS4FERHdjkg0\nPulnAVixj8o1oACuEmlU1d7IkJ++3yXz8y7VAHjwzhHMGoxzlaJPQk76He0jWX3p\nlaFjLj3qMZ5Qw2LI08TyRIY2TYreVK9ipEEYEA+xqQKBgQDU3WHawjTk6Tqkwq9Q\nphKslBWsA+6xNXo2/84Rb6aaCuqJh98tPGLZ8/REn/r8fcQTk5x8l5BYIya4tMw2\n8kB0XDBicgfbrH0TJ1c+8RHlp8baCk0uXx+EBm6Lr030jbUYeR8ayzKny9TPDs+B\ng1AHsXg0xMGnv+BJ/ZRVE33pxwKBgQDHJkYd2U4CuzT7P1an+06gYU+lohCOGe4y\nb15NKBdWKfbaFLHYAccugG1dqMZhk+Uw0UAtBp/XuIiSfi5CCjR2vrC6FkDbQMeb\nnD9CJAbOwAVNyaABb6ct9CKaBYlsjSi1+0+n5ZPWZW4IHyxNJFjtc6vEHtEcbANi\noCTQoyw9XwKBgQCSSlMl9LJFX8Rd1y6FTp0m3d7HCSzRvN7xTXxhn0nwM/Bb9HT8\nsbN99pq5Tvk+7XADxD6XodIhwIasChUO7g496d2Wyqd74V9T+oWLTEHwgw22a73/\nUIBoS8NNXH1GxNzgpN0rnNqDVyI56wPRDl3B68Wg/lfY4ZVTRGLc1TiDoQKBgHlo\nEtzFijJOEGmO3nQ/11ocmOKf3znSAw2KKVIeO8PSh2PBs/28b8Iglwu/BVmdQN62\n4knQvQdUvyWXePnXoM43SCPZxyYi4s0xvrrCncfS9ijK3xmhCKkSKTn+YB3mHEh8\n8b2oTq0oXqDi6C4LF4+Csdc49kA+dP3eJTNwFls/AoGBAJSZZTZL4BdRCaAHXtPf\nQ7qf7iuM9C5gy1ZIVV8x8/n+P+a9TJiuRAY8hiGrdsvvTKs8fV47HcMe1An7M8AO\nKykqRY17VJ1Nw61vIDjRjNFpsXkPxWW+qtiFKgH0/R+Yadk7c9usRBzba9vH381m\nwjHwdHoj+1f/LXolNsLK0Vv3\n-----END PRIVATE KEY-----\n",
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
//   "project_id": "dubaimobiles-55807",
//   "private_key_id": "07caebc6aabe11f29a965ce911d1303e26045e9c",
//   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCMqDbNASx3hXu4\nByyTlq/30/2gLygD4/tEr7f9gf81V/Aiq/4mTQbl4bSV9PyEn7RoN3JG7mi11+2a\ndCx9gAefzx+tBwh028gyzEmC4kZeqxJCQUQV8KcQnj/htAhsjJldWiC7VJ/zAzNd\n+NKjNH4uD97ka20m5XZZ/fE4E7ek0EwbYo5UFoxCrvkf4jGhVnXLcKwT0l9sZ/QG\nvNNwpASYMHHnRgeC72KAUI6qjzeLO+zbjt5N2UnkCrMRkQZMlrN/6chsFoK6UOUJ\nsAdd9ZqZNQOlUeQM98JlAw+yLLFmrg8/XnLbSngGVjbfjjXKlmLgZtOhWhtDWbTn\nlTV3eJkVAgMBAAECggEADmwxMlQsexT02qnhqECLSp4yI3qyX7PA0Ao0k4oA4Tdj\nKCr6pHLBglDic33rZq35kbYdwagwlHTPqEbBSR0XqwtR9CwEcfcXUB4ia4lILezc\nsm5+zMEgYFPZuQr80iSYlTnooUzMGd76JWieMJ3xUkfOUx2w04wz1oZzdYyQCBYs\nzPd33Fva6DfFQI+DecELQ8Dcwkd5Td/eGN4cANZAvebSWvO/tO/+MmVrMJSRhaLv\nHVpXqxnImWlXVCyOYkhbPID1PEGo9bZ/4UA2uLKXBultMgsr73cLnC0lMsMGVnTe\nMct+8uYQJ9uMeAXrI5TsYPIhv6At3uHHbMUKkIOTAQKBgQC/Xi48QmNGHmSE7i9u\nd/pdfdzUFeN6AR9POyezt4pFpewQbQhkqYNfRAlu8YJMyppoin3yb9ny/jZO//oE\nGStfc82kikyWZQOrdyN5LaFk6FN7mOSa4LP9VEAPQB3AW/VNK/UYpk9BNwVEmNBK\nQQUG5j28LGoQxoasvxnhXSkBGwKBgQC8KYl4Usccifqz4HM31krWSq1smJdLAXyb\nUdKAEWVERhfgMN2I6xwLrYLy/8OxrZDg9A7myJvYmsjIIBII8ymYIPqM04HM93Sh\ngXqTVcPDWRefYg0O3Om/dP/m2V05NspB0m7PS/PIkLLqN2mvcS86OtOn2NN9HSR3\nwZtamI2hjwKBgEfMAfTBw5UvGe91nX4IrXoeGpfHjozblu+W9hJLLilrUuHmxltd\n7df0IsXo/kXpTX0jWJV4uYCdN6r0Bs061Db/r4uoB4v1YicWj8yK/h5pu8iHWF1z\nKJRG47HVEFR3K9VERLR20Q1aozNVUfBJ7KTmBQtwbmrU0PpGyGLxHM05AoGAQRuK\nUtUpyok/83/lvltrF81NRvdh2nVQPZpJYUEjrkUmu8+MyHS6BpxqZFT1zQRGzmAE\ny/x8WK3ubbkTJH+nU9mNeK8zCc5SUBQyasrRa0Xns6HE7PCp/TKp3aI27LY1tCLx\nbs9UMoFHN14nNqrOcbKrTDftriwoUzvt2qJQ16cCgYBWmtV9+dGqGkPvju6V4yze\n2s97boUVnxPqkQEntfMNJH/fU9+KiuYAL1BovltFl8ScTBQzcEzhKHrjRmHncQPw\nwAl6pQhCMnTJVlmmWy4mXvdyVyWYKwW3GfOvd7aMNArJMyqFuttRu0tgeWyZhM91\nkuwipCDoWfEa53siFrnq+g==\n-----END PRIVATE KEY-----\n",
//   "client_email": "dubaimobiles@dubaimobiles-55807.iam.gserviceaccount.com",
//   "client_id": "107267238546098096188",
//   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//   "token_uri": "https://oauth2.googleapis.com/token",
//   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//   "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/dubaimobiles%40dubaimobiles-55807.iam.gserviceaccount.com",
//   "universe_domain": "googleapis.com"
// };

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message);
    throw error;
  }
}



const db = admin.firestore();

module.exports = {
  admin,
  db,
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp
};
