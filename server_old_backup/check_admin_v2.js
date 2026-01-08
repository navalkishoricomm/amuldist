const mongoose = require('mongoose');
// const User = require('./server/models/User'); // Commented out to avoid path issues

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'distributor', 'retailer', 'staff'], default: 'retailer' },
  active: { type: Boolean, default: true },
  phone: String,
  address: String,
  profileEditedOnce: { type: Boolean, default: false },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
}, { timestamps: true });

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

async function checkUserStandalone() {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      
      const user = await UserModel.findOne({ email: 'admin@local' });
      if (user) {
        console.log('User admin@local found:', JSON.stringify(user, null, 2));
      } else {
        console.log('User admin@local not found');
      }

       const user2 = await UserModel.findOne({ email: 'admin@example.com' });
      if (user2) {
        console.log('User admin@example.com found:', JSON.stringify(user2, null, 2));
      }
  
    } catch (err) {
      console.error('Error:', err);
    } finally {
      await mongoose.disconnect();
    }
  }

checkUserStandalone();
