// dev script: hash existing plaintext claimCode fields into claimCodeHash
const mongoose = require('mongoose');
const Student = require('../server/src/config/models/students');
const crypto = require('crypto');

function hashClaimCode(code) {
  const secret = process.env.CLAIM_SECRET || 'dev-claim-secret';
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
}

async function run() {
  const url = process.env.MONGO_URL || 'mongodb://localhost:27017/attendance';
  await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  const cursor = Student.find({ claimCode: { $ne: null } }).cursor();
  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      const code = doc.claimCode;
      doc.claimCodeHash = hashClaimCode(code);
      doc.claimCode = null;
      await doc.save();
      count++;
    } catch (e) {
      console.error('err saving', e);
    }
  }
  console.log('hashed', count, 'records');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
