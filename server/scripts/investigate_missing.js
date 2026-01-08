
const mongoose = require('mongoose');
require('dotenv').config(); // Defaults to .env in CWD
const { Schema } = mongoose;

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

async function check() {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const Order = mongoose.model('Order', new Schema({}, { strict: false }));
  const Transaction = mongoose.model('Transaction', new Schema({}, { strict: false }));
  const User = mongoose.model('User', new Schema({}, { strict: false }));

  // Find orders created today (Dec 29 2025)
  const startOfDay = new Date('2025-12-28T18:30:00.000Z'); // Dec 29 00:00 IST approx (UTC-5.5)
  
  console.log('Searching for orders created on/after:', startOfDay);

  const orders = await Order.find({ 
      createdAt: { $gte: startOfDay } 
  }).sort({ createdAt: -1 });

  console.log(`Found ${orders.length} orders since start of day.`);

  let missingCount = 0;

  for (const o of orders) {
      const tx = await Transaction.findOne({ referenceId: o._id });
      const retailer = await User.findById(o.retailerId);
      const retailerName = retailer ? retailer.name : 'Unknown';

      if (tx) {
          console.log(`[OK] Order ${o._id} (${retailerName}): Tx found ${tx._id} (Type: ${tx.type})`);
      } else {
          console.error(`[MISSING] Order ${o._id} (${retailerName}): NO TRANSACTION FOUND!`);
          missingCount++;
          
          // REPAIR LOGIC
          console.log('--> Repairing: Creating missing transaction record...');
          try {
             await Transaction.create({
                  distributorId: o.distributorId,
                  retailerId: o.retailerId,
                  type: 'order',
                  amount: o.totalAmount,
                  referenceId: o._id,
                  note: 'Order placed via app (Restored)',
                  createdAt: o.createdAt, // Preserve original date
                  updatedAt: new Date()
              });
              console.log('--> FIXED.');
          } catch (e) {
              console.error('--> FAILED TO FIX:', e.message);
          }
      }
  }

  console.log(`\nSummary: ${orders.length} orders checked. ${missingCount} missing transactions found and repaired.`);
  
  process.exit();
}

check().catch(console.error);
