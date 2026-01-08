const mongoose = require('mongoose');

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
}, { strict: false }); // strict: false to see all fields

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

async function checkUserType() {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      
      const user = await UserModel.findOne({ email: 'admin@local' });
      if (user) {
        console.log('User found:', JSON.stringify(user, null, 2));
        console.log('ID Type:', typeof user._id);
        console.log('ID Constructor:', user._id.constructor.name);
        console.log('ID toString:', user._id.toString());
        
        // Try finding by ID using String
        const byIdString = await UserModel.findOne({ _id: user._id.toString() });
        console.log('Found by ID (String query):', !!byIdString);

        // Try finding by ID using ObjectId
        try {
            const byIdObject = await UserModel.findOne({ _id: new mongoose.Types.ObjectId(user._id.toString()) });
            console.log('Found by ID (ObjectId query):', !!byIdObject);
        } catch (e) {
            console.log('Error creating ObjectId:', e.message);
        }

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
