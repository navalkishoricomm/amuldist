const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  distributorId: mongoose.Schema.Types.ObjectId
});
const User = mongoose.model('User', userSchema);

async function checkUser() {
  try {
    await mongoose.connect(mongoUri);
    const user = await User.findOne({ email: 'rohitk29@gmail.com' });
    if (user) {
      console.log('User found:', user);
    } else {
      console.log('User not found');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
