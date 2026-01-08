const mongoose = require('mongoose');

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
}, { strict: false });

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

async function checkUserType() {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      
      // Use lean() to get raw object
      const user = await UserModel.findOne({ email: 'admin@local' }).lean();
      if (user) {
        console.log('User found (lean):', JSON.stringify(user, null, 2));
        console.log('ID Type:', typeof user._id);
        if (user._id && user._id.constructor) {
             console.log('ID Constructor:', user._id.constructor.name);
        } else {
             console.log('ID Constructor: undefined (primitive?)');
        }

        // Try finding explicitly by String _id
        const byIdString = await UserModel.findOne({ _id: user._id.toString() }).lean();
        console.log('Found by ID (String query):', !!byIdString);
        
      } else {
        console.log('User admin@local not found');
      }
  
    } catch (err) {
      console.error('Error:', err);
    } finally {
      await mongoose.disconnect();
    }
  }

checkUserType();
