const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'distributor', 'retailer', 'staff'], required: true },
    active: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permissions: [{ type: String }],
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentBalance: { type: Number, default: 0 },
    profileEditedOnce: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

async function debug() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const distributor = await User.findOne({ email: 'rohitk29@gmail.com' });
    if (!distributor) {
      console.log('Distributor not found');
      return;
    }
    console.log('Distributor:', distributor.name, distributor.email, distributor._id, typeof distributor._id);

    const count = await User.countDocuments({ role: 'retailer', distributorId: distributor._id });
    console.log(`Found ${count} retailers for this distributor using object query.`);

    const retailers = await User.find({ role: 'retailer', distributorId: distributor._id }).limit(5);
    console.log('First 5 retailers:', retailers.map(r => ({ name: r.name, distId: r.distributorId })));

    // Check if maybe stored as string?
    const countStr = await User.countDocuments({ role: 'retailer', distributorId: distributor._id.toString() });
    console.log(`Found ${countStr} retailers for this distributor using string query.`);

    // Check one retailer to see raw structure
    const one = await User.findOne({ role: 'retailer' });
    if (one) {
        console.log('Sample retailer:', one.name, 'DistributorId:', one.distributorId, 'Type:', typeof one.distributorId);
        console.log('Does it match?', String(one.distributorId) === String(distributor._id));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

debug();
