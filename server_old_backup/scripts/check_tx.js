
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const { Schema } = mongoose;

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

async function check() {
  await mongoose.connect(mongoUri);
  
  console.log('Connected to DB');

  const Order = mongoose.model('Order', new Schema({}, { strict: false }));
  const Transaction = mongoose.model('Transaction', new Schema({}, { strict: false }));

  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5).lean();
  console.log('Recent 5 orders:');
  orders.forEach(o => console.log(`Order ${o._id} - Retailer: ${o.retailerId}, Dist: ${o.distributorId}, Total: ${o.totalAmount}, Created: ${o.createdAt}`));

  const transactions = await Transaction.find({ type: 'order' }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('\nRecent 5 order transactions:');
  transactions.forEach(t => console.log(`Tx ${t._id} - Retailer: ${t.retailerId}, Dist: ${t.distributorId}, Ref: ${t.referenceId}, Amount: ${t.amount}, Created: ${t.createdAt}`));

  // Simulate GET /api/my/transactions logic
  console.log('\nSimulating GET /api/my/transactions...');
  
  if (orders.length > 0) {
      const sample = orders[0];
      const distributorId = sample.distributorId;
      const retailerIdStr = sample.retailerId;
      
      console.log(`Using sample from Order ${sample._id}: Dist=${distributorId}, Retailer=${retailerIdStr}`);

      const filter = { distributorId };
      try {
         filter.retailerId = new mongoose.Types.ObjectId(String(retailerIdStr));
         console.log('Casted retailerId:', filter.retailerId);
      } catch (e) {
         console.log('Failed to cast retailerId');
      }
      
      console.log('Filter:', filter);
      
      const items = await Transaction.find(filter).sort({ createdAt: -1 });
      console.log('Found items:', items.length);
      items.forEach(t => console.log(t._id, t.type, t.amount));
  } else {
      console.log('No orders found to test with.');
  }
  
  process.exit();
}

check().catch(console.error);
