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

async function main() {
  await mongoose.connect(mongoUri);
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    const pwd = await bcrypt.hash('admin123', 10);
    admin = await User.create({ name: 'Admin', email: 'admin@local', role: 'admin', active: true, passwordHash: pwd });
    console.log('created admin');
  } else {
    const pwd = await bcrypt.hash('admin123', 10);
    admin.email = 'admin@local';
    admin.passwordHash = pwd;
    admin.active = true;
    await admin.save();
    console.log('reset admin');
  }
  console.log(JSON.stringify({ _id: admin._id, email: admin.email }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); try { await mongoose.disconnect(); } catch {} process.exit(1); });

