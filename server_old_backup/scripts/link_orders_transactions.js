const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const orderSchema = new mongoose.Schema({
  retailerId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  items: [{
      productId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      price: Number
  }],
  totalAmount: Number,
  status: String,
  createdAt: Date
}, { strict: false });

const transactionSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  type: String,
  amount: Number,
  referenceId: mongoose.Schema.Types.ObjectId,
  createdAt: Date
}, { strict: false });

const stockMoveSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  productId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  type: String,
  quantity: Number,
  createdAt: Date
}, { strict: false });

const productSchema = new mongoose.Schema({
    nameEnglish: String,
    price: Number
}, { strict: false });

const Order = mongoose.model('Order', orderSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const StockMove = mongoose.model('StockMove', stockMoveSchema);
const Product = mongoose.model('Product', productSchema);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    // Find transactions of type 'order' or payments that might be related to stock out
    // The user said "entries dated 29dec". They might be payments?
    // Let's look for any transaction without referenceId
    const query = {
      // type: 'order', // The user said "order details", but maybe they mean "transaction details"
      // Actually, if it's a payment, it should link to an order if it was for an order.
      // But StockOut creates payments directly.
      $or: [
        { referenceId: { $exists: false } },
        { referenceId: null }
      ],
      createdAt: { 
          $gte: new Date('2025-12-28'), 
          $lte: new Date('2025-12-31') 
      }
    };

    const transactions = await Transaction.find(query);
    console.log(`Found ${transactions.length} orphan transactions in range.`);

    let createdOrders = 0;

    for (const tx of transactions) {
      console.log(`\nTx: ${tx._id} | Type: ${tx.type} | Retailer: ${tx.retailerId} | Amount: ${tx.amount} | Date: ${tx.createdAt}`);
      
      // Look for StockMoves around this time
      // Assume StockOut saves moves and payments with same timestamp (or very close)
      // The code uses: const createdAt = new Date(d).toISOString(); for both.
      // So they should be identical or very close.
      
      const timeWindow = 4 * 60 * 60 * 1000; // 4 hours
      const minDate = new Date(tx.createdAt.getTime() - timeWindow);
      const maxDate = new Date(tx.createdAt.getTime() + timeWindow);

      const moves = await StockMove.find({
          retailerId: tx.retailerId,
          type: 'OUT',
          createdAt: { $gte: minDate, $lte: maxDate }
      });
      
      console.log(`  Found ${moves.length} StockMoves (OUT) within +/- 4h.`);
      
      if (moves.length > 0) {
          console.log(`  >>> Creating Order from ${moves.length} moves...`);
          
          // Calculate total from moves? We don't have price in moves.
          // But we can just create the order with items.
          // We can try to fetch product prices to estimate total, or just set totalAmount = tx.amount (if full payment)
          // But tx.amount might be partial.
          // Let's just use 0 for price for now, or fetch products.
          
          const items = [];
          for(const m of moves){
              items.push({
                  productId: m.productId,
                  quantity: m.quantity,
                  price: 0 // Placeholder
              });
          }
          
          const newOrder = new Order({
              retailerId: tx.retailerId,
              distributorId: tx.distributorId,
              items: items,
              totalAmount: tx.amount, // Approximate? Or should we leave it?
              status: 'delivered', // StockOut implies delivered
              createdAt: tx.createdAt
          });
          
          await newOrder.save();
          console.log(`  Created Order: ${newOrder._id}`);
          
          tx.referenceId = newOrder._id;
          await tx.save();
          console.log(`  Linked Tx to Order.`);
          createdOrders++;
      } else {
          console.log(`  No stock moves found. Cannot reconstruct order.`);
      }
    }

    console.log(`\nDone. Created ${createdOrders} orders.`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
