const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/amul_dist_app';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function check() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to', mongoUri);
    
    const retailerId = '693e42e106110d7635e57cb7';
    const user = await User.findById(retailerId);
    console.log('User found:', user);
    
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}

check();
