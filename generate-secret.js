const crypto = require('crypto');

// Generate random string
const secret = crypto.randomBytes(64).toString('hex');
console.log('Generated JWT_REFRESH_SECRET:');
console.log(secret);
console.log('\nCopy this line to your .env file:');
console.log(`JWT_REFRESH_SECRET=${secret}`);
