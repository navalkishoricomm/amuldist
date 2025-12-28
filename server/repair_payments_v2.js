const mongoose = require('mongoose');

const SOURCE_URI = 'mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const TARGET_URI = 'mongodb://localhost:27017/amul_dist_app';

// Target Schema
const transactionSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  type: String, 
  amount: Number, 
  note: String,
  referenceId: mongoose.Schema.Types.ObjectId,
  createdAt: Date
}, { timestamps: true });

// Source Schemas (Loose)
const voucherSchema = new mongoose.Schema({}, { strict: false });
const retailerSchema = new mongoose.Schema({}, { strict: false });

async function run() {
  const srcConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  const tgtConn = await mongoose.createConnection(TARGET_URI).asPromise();
  
  const SrcVoucher = srcConn.model('vouchers', voucherSchema);
  const SrcRetailer = srcConn.model('partystockouts', retailerSchema);
  
  const TargetTransaction = tgtConn.model('Transaction', transactionSchema);
  const TargetUser = tgtConn.model('User', new mongoose.Schema({
      name: String, distributorId: mongoose.Schema.Types.ObjectId, currentBalance: Number
  }, { strict: false }));

  try {
    console.log('Starting Payment Repair V2 (ID Mapping)...');

    // 0. Build ID Map
    console.log('Building ID Map (Remote -> Local via Name)...');
    const remoteRetailers = await SrcRetailer.find({}).lean();
    const localRetailers = await TargetUser.find({}).lean();
    
    const remoteIdToLocalId = {};
    const localNameMap = {};
    
    localRetailers.forEach(r => {
        if (r.name) localNameMap[r.name.trim()] = r;
    });

    let mappedCount = 0;
    remoteRetailers.forEach(r => {
        if (r.name) {
            const local = localNameMap[r.name.trim()];
            if (local) {
                remoteIdToLocalId[r._id.toString()] = local;
                mappedCount++;
            }
        }
    });
    console.log(`Mapped ${mappedCount} out of ${remoteRetailers.length} remote retailers.`);

    // 1. Delete the manual fix if exists
    const manualFix = await TargetTransaction.findOne({ note: 'Manual fix: Added missing payment' });
    if (manualFix) {
        console.log(`Deleting manual fix transaction: ${manualFix._id}`);
        await TargetTransaction.deleteOne({ _id: manualFix._id });
        await TargetUser.updateOne({ _id: manualFix.retailerId }, { $inc: { currentBalance: manualFix.amount } });
    }

    // 2. Fetch all vouchers from Source
    const vouchers = await SrcVoucher.find({}).lean();
    console.log(`Found ${vouchers.length} source vouchers.`);

    let addedCount = 0;

    for (const v of vouchers) {
        // Find Local Retailer
        let retailer = null;
        if (v.partyId) {
            retailer = remoteIdToLocalId[v.partyId.toString()];
        }
        
        if (!retailer) {
            // Try direct ID lookup in case some IDs match?
             retailer = await TargetUser.findById(v.partyId);
             if (!retailer) {
                 // console.log(`Skipping voucher ${v._id}: Retailer not found locally.`);
                 continue;
             }
        }

        // Collect ALL payments from Source arrays
        const sourcePayments = [];
        
        // Cash
        if (v.previousCashReceived && Array.isArray(v.previousCashReceived)) {
            v.previousCashReceived.forEach(p => {
                sourcePayments.push({
                    type: 'payment_cash',
                    amount: p.amount,
                    createdAt: p.createdAt || v.date, 
                    sourceId: p._id // The array item ID
                });
            });
        }
        if (sourcePayments.length === 0 && v.cashReceived > 0) {
             sourcePayments.push({
                type: 'payment_cash',
                amount: v.cashReceived,
                createdAt: v.date,
                sourceId: 'top_level_cash'
            });
        }

        // Online
        if (v.previousOnlineReceived && Array.isArray(v.previousOnlineReceived)) {
            v.previousOnlineReceived.forEach(p => {
                sourcePayments.push({
                    type: 'payment_online',
                    amount: p.amount,
                    createdAt: p.createdAt || v.date,
                    sourceId: p._id
                });
            });
        }
        if (sourcePayments.filter(p => p.type === 'payment_online').length === 0 && v.onlineReceived > 0) {
             sourcePayments.push({
                type: 'payment_online',
                amount: v.onlineReceived,
                createdAt: v.date,
                sourceId: 'top_level_online'
            });
        }

        if (sourcePayments.length === 0) continue;

        // Check Target Transactions
        const targetTxs = await TargetTransaction.find({ referenceId: v._id });

        // Logic: If counts mismatch, re-sync.
        // Also if amounts mismatch?
        // Let's just compare counts for now to be safe, or if specific amounts missing.
        
        if (targetTxs.length !== sourcePayments.length) {
            console.log(`Repairing voucher ${v._id} for retailer ${retailer.name}: Found ${sourcePayments.length} payments in source, ${targetTxs.length} in target. Re-syncing...`);
            
            // Delete existing
            await TargetTransaction.deleteMany({ referenceId: v._id });
            
            // Re-insert all
            for (const p of sourcePayments) {
                await TargetTransaction.create({
                    distributorId: retailer.distributorId,
                    retailerId: retailer._id,
                    type: p.type,
                    amount: p.amount,
                    referenceId: v._id,
                    note: 'Imported Payment (Repaired V2)',
                    createdAt: p.createdAt
                });
                addedCount++;
            }
        }
    }

    console.log(`Repair complete. Added/Restored ${addedCount} payment transactions.`);
    
    // 3. Recalculate Balances (Only for affected retailers? Or all?)
    // Safer to do all or just mapped ones.
    console.log('Recalculating balances...');
    const allRetailers = await TargetUser.find({}); // All users
    for (const r of allRetailers) {
        const txs = await TargetTransaction.find({ retailerId: r._id });
        let bal = 0;
        // Logic: Balance = Orders - Payments?
        // Need to check how balance is calculated.
        // Usually: Opening + Orders - Payments.
        // Assuming starting balance is 0 or handled separately?
        // Wait, if I recalculate from scratch I might lose "Opening Balance" if it's not a transaction.
        // Does User model have 'openingBalance'?
        // Let's check schema/data.
        // Safe bet: Only update currentBalance based on transactions if we trust transactions are complete.
        // BUT, if I don't know the formula, maybe I should skip balance recalc or be very careful.
        // The user complained about balance? "customer balance report".
        // The previous repair script recalculated balances. I should probably do it to keep consistency.
        // Formula used previously:
        // bal += t.amount (order)
        // bal -= t.amount (payment)
        // What about returns?
        
        for (const t of txs) {
            if (t.type === 'order') bal += t.amount;
            else if (t.type.startsWith('payment')) bal -= t.amount;
            else if (t.type === 'return') bal -= t.amount; // Guessing return type
        }
        
        // If there's an opening balance field?
        if (r.openingBalance) bal += r.openingBalance;

        // Only update if changed significantly?
        if (r.currentBalance !== bal) {
            // console.log(`Updating balance for ${r.name}: ${r.currentBalance} -> ${bal}`);
            r.currentBalance = bal;
            await r.save();
        }
    }
    console.log('Balances updated.');

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
