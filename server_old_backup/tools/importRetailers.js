const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'distributor', 'retailer'], required: true },
    active: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentBalance: { type: Number, default: 0 },
    profileEditedOnce: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

function slugify(s) {
  return String(s || 'retailer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .replace(/\.+/g, '.');
}
function digits(s) {
  return String(s || '').replace(/\D+/g, '');
}

async function main() {
  await mongoose.connect(mongoUri);
  let distributor = await User.findOne({ role: 'distributor', name: 'demo distributor' });
  if (!distributor) distributor = await User.findOne({ role: 'distributor', email: 'demo.distributor@local' });
  if (!distributor) {
    let demoEmail = 'demo.distributor@local';
    const exists = await User.findOne({ email: demoEmail });
    if (exists) demoEmail = `demo.distributor.${Date.now()}@local`;
    const demoPasswordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
    distributor = await User.create({ name: 'demo distributor', email: demoEmail, role: 'distributor', active: true, passwordHash: demoPasswordHash });
  }

  const retailers = [
    { name: 'बालाजी स्टोर', address: 'Pkt 1', phoneNumber: '+919910413326', currentBalance: 1000 },
    { name: 'शंकर स्टोर', address: 'Pkt 1', phoneNumber: '+918750004503', currentBalance: 9996 },
    { name: 'श्री श्याम डेयरी', address: 'Pkt 1', phoneNumber: '090537 36535', currentBalance: 2763 },
    { name: 'पवन डेरी', address: 'Jj colony', phoneNumber: '+918595234344', currentBalance: 5739 },
    { name: 'मीना स्टोर', address: 'J J colony', phoneNumber: '9210027297', currentBalance: 458 },
    { name: 'बी के स्टोर', address: 'Jj colony', phoneNumber: '1234567891', currentBalance: 909 },
    { name: 'गुप्ता स्टोर', address: 'Jj colony', phoneNumber: '1234567892', currentBalance: 1392 },
    { name: 'न्यू पवन कन्फेक्शनरी', address: 'Jj colony', phoneNumber: '97114 37575', currentBalance: 0 },
    { name: 'मिथुन स्टोर', address: 'Jj colony', phoneNumber: '1234567893', currentBalance: 3700 },
    { name: 'लक्ष्मी स्टोर पॉकेट 2', address: 'Pkt 2', phoneNumber: '098687 13368', currentBalance: 3143 },
    { name: 'कृष्ण स्टोर पॉकेट 4', address: 'पॉकेट 4', phoneNumber: '+919971284706', currentBalance: 8056 },
    { name: 'गिरिराज स्टोर', address: 'Pkt 2', phoneNumber: '093136 94061', currentBalance: 3000 },
    { name: 'न्यू शिवम स्टोर', address: 'Pkt 4', phoneNumber: '099995 19088', currentBalance: 0 },
    { name: 'दीपक स्टोर', address: 'Pkt', phoneNumber: '098215 95480', currentBalance: 0 },
    { name: 'लक्ष्मी स्टोर प्रहलाद विहार', address: 'प्रहलाद विहार', phoneNumber: '+919540297805', currentBalance: 5761 },
    { name: 'जैन स्टोर', address: 'प्रहलाद विहार', phoneNumber: '+917703935168', currentBalance: 2504 },
    { name: 'रचित स्टोर', address: 'Pkt', phoneNumber: '+919811773231', currentBalance: 500 },
    { name: 'मोटी', address: 'JJ colony', phoneNumber: '1234567894', currentBalance: 379 },
    { name: 'दुर्गा स्टोर', address: 'JJ colony', phoneNumber: '093500 08345', currentBalance: 814 },
    { name: 'मटके वाली अम्मा', address: 'JJ colony', phoneNumber: '1234567895', currentBalance: 612 },
    { name: 'सम्यक स्टोर', address: 'JJ colony', phoneNumber: '093100 12367', currentBalance: 500 },
    { name: 'पायल स्टोर', address: 'JJ colony', phoneNumber: '+919643112441', currentBalance: 3442 },
    { name: 'कमल स्टोर', address: 'JJ colony', phoneNumber: '1234567896', currentBalance: 0 },
    { name: 'लक्ष्मी स्टोर कॉलोनी', address: 'JJ colony', phoneNumber: '1234567897', currentBalance: 0 },
    { name: 'महादेव स्टोर', address: 'JJ colony', phoneNumber: '1234567898', currentBalance: 2786 },
    { name: 'विनायक स्टोर', address: 'JJ colony', phoneNumber: '1234567899', currentBalance: 0 },
    { name: 'जय माता स्टोर', address: 'JJ colony', phoneNumber: '1234567890', currentBalance: 0 },
    { name: 'कपिल स्टोर', address: 'JJ colony', phoneNumber: '9876543211', currentBalance: 1441 },
    { name: 'गढ़वाल पनीर भंडार', address: 'JJ colony', phoneNumber: '9876543212', currentBalance: 473 },
    { name: 'जांगड़ा स्टोर', address: 'Pkt 9', phoneNumber: '9991820681', currentBalance: 0 },
  ];

  const created = [];
  const errors = [];
  for (let i = 0; i < retailers.length; i++) {
    const r = retailers[i];
    const name = r.name;
    const address = r.address || '';
    const phone = r.phoneNumber || '';
    const currentBalance = Number(r.currentBalance) || 0;
    let base = slugify(name);
    let suffix = digits(phone).slice(-4);
    if (!suffix) suffix = Math.random().toString(36).slice(2, 6);
    let email = `${base}.${suffix}@retailer.local`;
    const exists = await User.findOne({ email });
    if (exists) email = `${base}.${Date.now()}@retailer.local`;
    const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
    try {
      const u = await User.create({ name, email, role: 'retailer', active: true, passwordHash, phone, address, distributorId: distributor._id, currentBalance });
      created.push({ _id: u._id, name: u.name, email: u.email });
    } catch (e) {
      errors.push({ index: i, error: 'create failed' });
    }
  }

  console.log(JSON.stringify({ distributorId: distributor._id, createdCount: created.length, errorCount: errors.length, created, errors }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });

