const mongoose = require('mongoose');
const User = require('./server/models/User'); // Adjust path if needed, assuming run from root

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

async function checkUser() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'admin@local' });
    if (user) {
      console.log('User found:', JSON.stringify(user, null, 2));
    } else {
      console.log('User admin@local not found');
    }
    
    // Also check for admin@example.com just in case
    const user2 = await User.findOne({ email: 'admin@example.com' });
    if (user2) {
      console.log('User admin@example.com found:', JSON.stringify(user2, null, 2));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

// We need to define the Schema because we are running a standalone script 
// and requiring the model file might fail if it depends on app structure or connection being already established
// But let's try to just define a simple schema here to be safe and avoid dependency hell

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

// Check if model already exists to avoid overwrite error
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

async function checkUserStandalone() {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      
      const user = await UserModel.findOne({ email: 'admin@local' });
      if (user) {
        console.log('User found:', JSON.stringify(user, null, 2));
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
