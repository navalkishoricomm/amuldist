
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';
    await mongoose.connect(mongoUri);
    const id = '69152d6a860e17b5053ef0a3';
    console.log(`Checking for user ${id}...`);
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid ObjectId format');
        process.exit(0);
    }

    const collection = mongoose.connection.db.collection('users');
    const u = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    
    if (u) {
      console.log('User found:', { 
          id: u._id, 
          name: u.name, 
          role: u.role, 
          distributorId: u.distributorId 
      });
    } else {
      console.log('User NOT found in DB');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
})();
