const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/amul_dist_app';
const OUTPUT_DIR = path.join(__dirname, 'data_dump');

if (!fs.existsSync(OUTPUT_DIR)){
    fs.mkdirSync(OUTPUT_DIR);
}

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
  'retailer rates' // Note: this collection name has a space, usually handled by mongoose model name 'retailer rates'
];

const GenericSchema = new mongoose.Schema({}, { strict: false });

async function run() {
  try {
    console.log('Connecting to local MongoDB...');
    const conn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('Connected.');

    for (const name of collections) {
      console.log(`Exporting ${name}...`);
      const Model = conn.model(name, GenericSchema, name);
      const docs = await Model.find({}).lean();
      
      const filePath = path.join(OUTPUT_DIR, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
      console.log(`Saved ${docs.length} documents to ${filePath}`);
    }

    await conn.close();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
