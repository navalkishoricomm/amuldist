const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/amul_dist_app';

mongoose.connect(mongoUrl)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      active: Boolean,
      passwordHash: String
    });
    
    // Use the existing collection name if possible, usually 'users' based on model name 'User'
    const User = mongoose.model('User', userSchema);
    
    const admins = await User.find({ role: 'admin' });
    console.log('Admin users found:', admins.length);
    admins.forEach(u => {
      console.log(`- ${u.email} (Active: ${u.active})`);
    });

    if (admins.length === 0) {
        console.log("No admin users found. The bootstrap logic might not have run or failed.");
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
