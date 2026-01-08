const mongoose = require('mongoose');

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

async function fixMapping() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const targetEmail = 'rohitk29@gmail.com';
    const distributor = await User.findOne({ email: targetEmail });

    if (!distributor) {
      console.error(`User with email ${targetEmail} not found!`);
      process.exit(1);
    }

    console.log(`Found distributor: ${distributor.name} (${distributor._id})`);

    if (distributor.role !== 'distributor') {
        console.log(`User role is ${distributor.role}. Updating to distributor...`);
        distributor.role = 'distributor';
        await distributor.save();
        console.log('User role updated.');
    }

    const result = await User.updateMany(
      { role: 'retailer' },
      { $set: { distributorId: distributor._id } }
    );

    console.log(`Updated ${result.modifiedCount} retailers to point to distributor ${distributor.name}`);

    // Verify
    const count = await User.countDocuments({ role: 'retailer', distributorId: distributor._id });
    console.log(`Total retailers mapped: ${count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

fixMapping();
