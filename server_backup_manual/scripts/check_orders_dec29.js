const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const orderSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  distributorId: mongoose.Schema.Types.ObjectId,
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number
  }],
  totalAmount: Number,
  status: String,
  note: String,
  createdAt: Date
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function run() {
  try {
    const uri = 'mongodb://127.0.0.1:27017/amul_dist_app';
    await mongoose.connect(uri);
    
    // Look for orders from Dec 28 onwards
    const start = new Date('2025-12-28T00:00:00Z');
    
    console.log(`Checking orders since ${start.toISOString()}...`);
    
    const orders = await Order.find({ createdAt: { $gte: start } })
        .populate('retailerId', 'name')
        .sort({ createdAt: 1 });
        
    console.log(`Found ${orders.length} orders.`);
    
    if (orders.length === 0) {
        console.log("No orders found! This is unexpected if transactions were restored.");
    } else {
        orders.forEach(o => {
            const rName = o.retailerId ? o.retailerId.name : 'Unknown';
            const itemCount = o.items ? o.items.length : 0;
            console.log(`Order ${o._id}:`);
            console.log(`  Date: ${o.createdAt}`);
            console.log(`  Retailer: ${rName}`);
            console.log(`  Amount: ${o.totalAmount}`);
            console.log(`  Items: ${itemCount}`);
            console.log(`  Note: ${o.note}`);
            console.log('---');
        });
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
