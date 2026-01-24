const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

async function fixIndexes() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}));
    
    // Check existing indexes
    const indexes = await User.collection.indexes();
    console.log('Current Indexes:', indexes);

    const emailIndex = indexes.find(i => i.name === 'email_1');
    if (emailIndex) {
        if (!emailIndex.sparse) {
            console.log('Dropping non-sparse email index...');
            await User.collection.dropIndex('email_1');
            console.log('Dropped email_1');
        } else {
            console.log('Email index is already sparse.');
        }
    } else {
        console.log('Email index not found.');
    }

    // We don't need to manually recreate it if we rely on the app to do it, 
    // but to be safe/immediate, let's create it properly.
    // However, defining the schema here as empty might prevent proper creation via model.
    // Better to let the main app recreate it on restart, OR define the schema properly here.
    
    // Let's just drop it. The main app (index.js) has the full schema and will recreate it on startup 
    // if autoIndex is enabled (default true).
    
    console.log('Index fix complete. Please restart the main server.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixIndexes();