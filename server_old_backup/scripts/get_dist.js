
const mongoose = require('mongoose');
const { Schema } = mongoose;

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/amul_dist_app';

async function check() {
  await mongoose.connect(mongoUri);
  const User = mongoose.model('User', new Schema({}, { strict: false }));
  
  const dists = await User.find({ role: 'distributor' });
  console.log('Distributors:');
  dists.forEach(d => console.log(d.email, d._id));
  process.exit();
}
check().catch(console.error);
