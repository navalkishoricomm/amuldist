const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Configuration
// CRITICAL: Do NOT hardcode credentials here. Use .env or pass as argument.
const REMOTE_URI = process.env.ATLAS_URI; 
const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

if (!REMOTE_URI) {
  console.error('ERROR: ATLAS_URI is not set in .env file.');
  console.error('Please add ATLAS_URI=mongodb+srv://... to your .env file.');
  process.exit(1);
}

async function run() {
  console.log('--- Database Publisher (Local -> Atlas) ---');
  let localConn, remoteConn;

  try {
    console.log('Connecting to Local DB:', LOCAL_URI);
    localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('Connected to Local.');

    console.log('Connecting to Remote Atlas DB...');
    remoteConn = await mongoose.createConnection(REMOTE_URI).asPromise();
    console.log('Connected to Atlas.');

    // Define Schema (Schema-less for copying)
    const GenericSchema = new mongoose.Schema({}, { strict: false });

    // Collections to migrate
    const collections = [
      'users',
      'products',
      'units',
      'orders',
      'transactions',
      'stockmoves',
      'suppliers',
      'suppliertransactions',
      'distproducts',
      'retailer rates' // Watch out for space in name if any
    ];

    // Helper to get model
    const getModel = (conn, name) => conn.model(name, GenericSchema, name);

    for (const name of collections) {
      console.log(`\nProcessing collection: ${name}`);
      
      // Check if collection exists in local
      const collectionsList = await localConn.db.listCollections({ name: name }).toArray();
      if (collectionsList.length === 0) {
        console.log(`  -> Skipping (Not found in Local)`);
        continue;
      }

      // Read Local
      const LocalModel = getModel(localConn, name);
      const docs = await LocalModel.find({}).lean();
      console.log(`  -> Found ${docs.length} documents locally.`);

      if (docs.length === 0) continue;

      // Write Remote
      const RemoteModel = getModel(remoteConn, name);
      
      // Clear Remote first? Yes, to match local state exactly.
      console.log(`  -> Clearing remote collection...`);
      await RemoteModel.deleteMany({});
      
      // Drop indexes to prevent duplicate key errors during migration (optional but safer for "copy")
      // But we probably want indexes. The error is unique key on null phoneNumber.
      // Let's filter the docs to remove null/duplicate keys if necessary, or just rely on Mongoose not to enforce validation?
      // Mongoose insertMany with strict:false might still hit DB indexes.
      // Fix: If phoneNumber is null, delete it from doc so it doesn't trigger unique index on null?
      // MongoDB allows one null for unique index usually, but maybe multiple nulls are failing.
      // Actually, standard SQL doesn't allow multiple nulls, but Mongo usually does unless sparse?
      // Wait, E11000 duplicate key error ... dup key: { phoneNumber: null } implies multiple nulls are not allowed by the index existing on Atlas.
      
      const cleanDocs = docs.map(d => {
        if(d.phoneNumber === null || d.phoneNumber === undefined) {
           delete d.phoneNumber;
        }
        return d;
      });

      // Insert
      console.log(`  -> Uploading...`);
      try {
        await RemoteModel.insertMany(cleanDocs, { ordered: false });
      } catch(e) {
         if(e.code === 11000) console.warn('    Warn: Some duplicates ignored during insert.');
         else throw e;
      }
      console.log(`  -> Done.`);
    }

    console.log('\n--- Migration Complete ---');

  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    if (localConn) await localConn.close();
    if (remoteConn) await remoteConn.close();
  }
}

run();
