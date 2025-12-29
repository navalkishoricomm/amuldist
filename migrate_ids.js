const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const collectionsToConvert = [
  { name: 'users', fields: ['distributorId', 'createdByStaffId'] },
  { name: 'products', fields: ['unit'] },
  { name: 'units', fields: ['firstUnit', 'secondUnit'] },
  { name: 'rates', fields: ['productId', 'distributorId'] },
  { name: 'globalrates', fields: ['productId'] },
  { name: 'retailerrates', fields: ['productId', 'distributorId', 'retailerId'] },
  { name: 'distproducts', fields: ['distributorId', 'unit'] },
  { name: 'distproducthides', fields: ['distributorId', 'productId'] },
  { name: 'inventories', fields: ['distributorId', 'productId'] },
  { name: 'stockmoves', fields: ['distributorId', 'productId', 'retailerId', 'supplierId', 'createdByStaffId'] },
  { name: 'suppliers', fields: ['distributorId'] },
  { name: 'suppliertransactions', fields: ['distributorId', 'supplierId', 'createdByStaffId'] },
  { name: 'transactions', fields: ['distributorId', 'retailerId', 'createdByStaffId', 'referenceId'] },
  { name: 'orders', fields: ['retailerId', 'distributorId'], nested: { items: ['productId'] } },
];

function toObjectId(val) {
  if (!val) return val;
  if (val instanceof ObjectId) return val;
  if (typeof val === 'string' && val.length === 24 && /^[0-9a-fA-F]{24}$/.test(val)) {
    return new ObjectId(val);
  }
  return val; // Return as is if not a valid hex string
}

async function migrate() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const config of collectionsToConvert) {
      const colName = config.name;
      const fields = config.fields;
      const nested = config.nested;

      console.log(`Processing ${colName}...`);
      const db = mongoose.connection.db;
      const collection = db.collection(colName);
      
      const docs = await collection.find({}).toArray();
      if (docs.length === 0) {
        console.log(`  Empty, skipping.`);
        continue;
      }

      const newDocs = docs.map(doc => {
        const newDoc = { ...doc };
        
        // Convert _id
        newDoc._id = toObjectId(doc._id);
        
        // Convert top-level fields
        fields.forEach(field => {
          if (newDoc[field]) {
            newDoc[field] = toObjectId(newDoc[field]);
          }
        });

        // Convert nested fields
        if (nested) {
          for (const [arrayName, nestedFields] of Object.entries(nested)) {
            if (newDoc[arrayName] && Array.isArray(newDoc[arrayName])) {
              newDoc[arrayName] = newDoc[arrayName].map(item => {
                const newItem = { ...item };
                nestedFields.forEach(nf => {
                  if (newItem[nf]) {
                    newItem[nf] = toObjectId(newItem[nf]);
                  }
                });
                if (newItem._id) {
                    newItem._id = toObjectId(newItem._id);
                }
                return newItem;
              });
            }
          }
        }
        
        return newDoc;
      });

      // Drop and re-insert
      await collection.drop();
      await collection.insertMany(newDocs);
      console.log(`  Converted ${newDocs.length} documents.`);
    }

    console.log('Migration complete.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
