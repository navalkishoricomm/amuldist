const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27018/amul_dist_app';

async function testConnection() {
  try {
    console.log('Testing connection to SSH tunnel...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connection successful!');
    
    // List collections to be sure
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
