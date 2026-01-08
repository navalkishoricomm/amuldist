const mongoose = require('mongoose');

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

async function checkTypes() {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const col of collections) {
          const name = col.name;
          if (name === 'system.views') continue;
          
          const doc = await mongoose.connection.db.collection(name).findOne({});
          if (doc) {
              console.log(`Collection: ${name}`);
              console.log(`  _id type: ${typeof doc._id}`);
              if (doc._id && doc._id.constructor) {
                  console.log(`  _id constructor: ${doc._id.constructor.name}`);
              }
              
              // Check foreign keys if any (heuristic)
              for (const key in doc) {
                  if (key.endsWith('Id') && key !== '_id') {
                      console.log(`  ${key} type: ${typeof doc[key]}`);
                       if (doc[key] && doc[key].constructor) {
                            console.log(`  ${key} constructor: ${doc[key].constructor.name}`);
                       }
                  }
              }
          } else {
              console.log(`Collection: ${name} (empty)`);
          }
      }
  
    } catch (err) {
      console.error('Error:', err);
    } finally {
      await mongoose.disconnect();
    }
  }

checkTypes();
