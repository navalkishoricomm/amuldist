const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema);
const transactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    // Define "Today" - adjusting for local time if needed, but assuming server time is consistent
    // Env says 2025-12-30.
    const startOfDay = new Date('2025-12-30T00:00:00.000Z'); 
    // Maybe subtract 5.5 hours for IST if stored in UTC but created in IST? 
    // Usually Mongo stores UTC. 
    // Let's just look at last 24 hours to be safe.
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log('Searching for orders since:', yesterday);

    const orders = await Order.find({ createdAt: { $gte: yesterday } }).sort({ retailerId: 1, createdAt: 1 });
    console.log(`Found ${orders.length} orders.`);

    const groups = [];
    let currentGroup = [];

    for (const order of orders) {
        if (currentGroup.length === 0) {
            currentGroup.push(order);
            continue;
        }

        const last = currentGroup[currentGroup.length - 1];
        const timeDiff = new Date(order.createdAt).getTime() - new Date(last.createdAt).getTime();
        
        // Group if same retailer and within 2 minutes (120000 ms)
        if (String(order.retailerId) === String(last.retailerId) && timeDiff < 120000) {
            currentGroup.push(order);
        } else {
            if (currentGroup.length > 1) groups.push(currentGroup);
            currentGroup = [order];
        }
    }
    if (currentGroup.length > 1) groups.push(currentGroup);

    console.log(`Found ${groups.length} groups to merge.`);

    for (const group of groups) {
        const retailerId = group[0].retailerId;
        const totalItems = group.reduce((acc, o) => acc + (o.items ? o.items.length : 0), 0);
        const totalAmount = group.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
        console.log(`Group: Retailer ${retailerId}, Orders: ${group.length}, Items: ${totalItems}, Amount: ${totalAmount}`);
        console.log(`  - Time span: ${group[0].createdAt} to ${group[group.length-1].createdAt}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();