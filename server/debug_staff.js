const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config(); path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true, sparse: true },
    role: { type: String, enum: ['admin', 'distributor', 'retailer', 'staff'], required: true },
    active: { type: Boolean, default: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, unique: true, trim: true, sparse: true },
    permissions: [{ type: String }],
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

async function checkAnil() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || mongoUri);
    console.log('Connected to MongoDB:', process.env.MONGODB_URI ? 'Atlas/Remote' : 'Local');

    // Find staff named Anil
    // Since names are not unique, find all "Anil" with role staff
    const count = await User.countDocuments({});
    console.log(`Total users in DB: ${count}`);
    const allUsers = await User.find({});
    allUsers.forEach(u => console.log(`User: ${u.name}, Role: ${u.role}, ID: ${u._id}`));

    const staff = await User.find({ role: 'staff', name: { $regex: /anil/i } });
    
    console.log(`Found ${staff.length} staff members matching "Anil"`);
    staff.forEach(s => {
        console.log('---');
        console.log(`ID: ${s._id}`);
        console.log(`Name: ${s.name}`);
        console.log(`Phone: ${s.phone}`);
        console.log(`Permissions: ${JSON.stringify(s.permissions)}`);
        console.log(`DistributorId: ${s.distributorId}`);

        // Generate token and test API
        const token = jwt.sign({ sub: s._id, role: s.role }, process.env.JWT_SECRET || 'amul_dist_secret_key_2024');
        console.log(`Testing /api/me for ${s.name}...`);
        
        fetch('http://localhost:4000/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            console.log('API Response Permissions:', JSON.stringify(data.permissions));
        })
        .catch(err => console.error('API Error:', err));
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Wait a bit for fetch to complete before disconnecting
    setTimeout(() => mongoose.disconnect(), 2000);
  }
}

checkAnil();
