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

    // Look for orders in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const orders = await Order.find({ createdAt: { $gte: yesterday } }).sort({ retailerId: 1, createdAt: 1 });
    
    const groups = [];
    let currentGroup = [];

    for (const order of orders) {
        if (currentGroup.length === 0) {
            currentGroup.push(order);
            continue;
        }

        const last = currentGroup[currentGroup.length - 1];
        const timeDiff = new Date(order.createdAt).getTime() - new Date(last.createdAt).getTime();
        
        // Group if same retailer and within 2 minutes
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
        const distributorId = group[0].distributorId;
        const staffId = group[0].createdByStaffId || null; // Might be mixed, pick first
        // Use the date of the LAST order in the group to ensure it covers all
        const date = group[group.length - 1].createdAt; 
        
        let mergedItems = [];
        let grandTotal = 0;
        let note = group[0].note; // Keep first note

        for (const o of group) {
            if (o.items && Array.isArray(o.items)) {
                mergedItems = mergedItems.concat(o.items);
            }
            grandTotal += (o.totalAmount || 0);
        }

        console.log(`Merging Group for Retailer ${retailerId}: ${group.length} orders -> 1 order. Total: ${grandTotal}`);

        // 1. Create New Order
        const newOrder = await Order.create({
            retailerId,
            distributorId,
            items: mergedItems,
            totalAmount: grandTotal,
            status: 'delivered', // Assume delivered as they were stock outs
            note: note + ' (Merged)',
            createdAt: date,
            // Preserve other fields if needed
        });
        console.log(`  Created New Order: ${newOrder._id}`);

        // 2. Create New Transaction
        const newTx = await Transaction.create({
            distributorId,
            retailerId,
            type: 'order',
            amount: grandTotal,
            referenceId: newOrder._id,
            note: note + ' (Merged)',
            createdByStaffId: staffId,
            createdAt: date
        });
        console.log(`  Created New Transaction: ${newTx._id}`);

        // 3. Delete Old Orders and Transactions
        const orderIds = group.map(o => o._id);
        
        // Find associated transactions
        // Assuming transaction.referenceId == order._id
        const txs = await Transaction.find({ referenceId: { $in: orderIds } });
        const txIds = txs.map(t => t._id);

        console.log(`  Deleting ${orderIds.length} old orders and ${txIds.length} old transactions...`);
        
        await Order.deleteMany({ _id: { $in: orderIds } });
        await Transaction.deleteMany({ _id: { $in: txIds } });

        console.log('  Done.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();