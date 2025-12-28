
const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/amul_dist_app';

async function checkUsers() {
  try {
    await mongoose.connect(mongoUri);
    const users = await mongoose.connection.collection('users').find({}).toArray();
    console.log('Users found:', users.length);
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
