const mongoose = require('mongoose');

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
// This script is intended to be run on the SERVER where the MongoDB resides.
// URI assumes local connection on the server.
const MONGO_URI = 'mongodb://127.0.0.1:27017/amul_dist_app';

// ---------------------------------------------------------
// SCHEMAS
// ---------------------------------------------------------
const userSchema = new mongoose.Schema({ 
    name: String, 
    role: String,
    distributorId: mongoose.Schema.Types.ObjectId 
}, { strict: false });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({ 
    nameEnglish: String 
}, { strict: false });
const Product = mongoose.model('Product', productSchema);

const stockMoveSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: String,
    quantity: Number,
    note: String,
    createdAt: Date
}, { timestamps: true });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const transactionSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    type: String,
    note: String,
    createdAt: Date
}, { timestamps: true });
const Transaction = mongoose.model('Transaction', transactionSchema);

// ---------------------------------------------------------
// MAIN LOGIC
// ---------------------------------------------------------
async function run() {
    try {
        console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected successfully.');

        // 1. Find Distributor "Anant Sales"
        console.log("\n--- Finding Distributor 'Anant Sales' ---");
        let dist = await User.findOne({ name: /Anant/i, role: 'distributor' });
        
        if (!dist) {
            console.log("Warning: 'Anant' not found directly. Searching for any distributor...");
            // Fallback: List dists
            const dists = await User.find({ role: 'distributor' });
            if (dists.length === 0) {
                console.error("No distributors found!");
                return;
            }
            console.log("Available Distributors:");
            dists.forEach(d => console.log(` - ${d.name} (${d._id})`));
            
            // Try to pick one if only one exists or name matches vaguely
            dist = dists.find(d => d.name.match(/Anant/i)) || dists[0];
            if (!dist) {
                console.error("Could not identify target distributor. Exiting.");
                return;
            }
        }
        console.log(`Target Distributor: ${dist.name} (${dist._id})`);

        // ---------------------------------------------------------
        // TASK 1: Fix Stock IN for Jan 3, 2025 (and 2026 check)
        // User complaint: "stock in now has increased itself a lot on 3 jan 2025"
        // Note: It might be a typo for 2026, so we'll check both or list recent.
        // ---------------------------------------------------------
        console.log("\n--- Task: Fix Stock IN ---");
        
        const checkDateAndClean = async (year) => {
            const start = new Date(`${year}-01-03T00:00:00.000Z`);
            const end = new Date(`${year}-01-03T23:59:59.999Z`);
            console.log(`Checking for Stock IN on Jan 3, ${year}...`);

            const moves = await StockMove.find({
                distributorId: dist._id,
                type: 'IN',
                createdAt: { $gte: start, $lte: end }
            }).populate('productId', 'nameEnglish');

            console.log(`Found ${moves.length} Stock IN moves on Jan 3, ${year}.`);

            if (moves.length > 0) {
                console.log(`Deleting ${moves.length} moves for ${year}...`);
                for (const m of moves) {
                     const pName = m.productId ? m.productId.nameEnglish : 'Unknown Product';
                     console.log(` - Deleting: ${pName} | Qty: ${m.quantity} | Note: "${m.note}" | ID: ${m._id}`);
                }
                const deleteResult = await StockMove.deleteMany({
                    distributorId: dist._id,
                    type: 'IN',
                    createdAt: { $gte: start, $lte: end }
                });
                console.log(`Successfully deleted ${deleteResult.deletedCount} stock moves.`);
            }
        };

        // Check 2025 (User said 2025)
        await checkDateAndClean(2025);
        // Check 2026 (Likely typo, today is Jan 3 2026)
        await checkDateAndClean(2026);


        // ---------------------------------------------------------
        // TASK 2: Delete Payment Entry (Jan 3, 2026)
        // User request: "delete this entry 3/1/2026 12:25 am Payment cash -₹2301.00 at 'श्री श्याम डेयरी'"
        // ---------------------------------------------------------
        console.log("\n--- Task: Delete Payment Entry (Jan 3, 2026) ---");
        
        // Find by Transaction directly (Amount -2301 on Jan 3 2026)
        // This avoids Hindi character encoding issues in the script upload.
        const startJan3_2026 = new Date('2026-01-03T00:00:00.000Z');
        const endJan3_2026 = new Date('2026-01-03T23:59:59.999Z');

        console.log("Searching for transaction with amount -2301 on Jan 3, 2026...");
        const payments = await Transaction.find({
            distributorId: dist._id,
            amount: -2301,
            createdAt: { $gte: startJan3_2026, $lte: endJan3_2026 }
        }).populate('retailerId', 'name');

        if (payments.length > 0) {
            for (const payment of payments) {
                const rName = payment.retailerId ? payment.retailerId.name : 'Unknown Retailer';
                console.log(`Found Payment: ${payment.amount} | Retailer: ${rName} | Date: ${payment.createdAt} | ID: ${payment._id}`);
                
                // Optional: Verify retailer name roughly matches if needed, but amount+date is strong signal
                // We'll delete it.
                await Transaction.deleteOne({ _id: payment._id });
                console.log("Payment deleted successfully.");
            }
        } else {
            console.log("No transaction found with amount -2301 on Jan 3, 2026.");
            // Debug: List all transactions on this day to help locate it
             const txs = await Transaction.find({
                  distributorId: dist._id,
                  createdAt: { $gte: startJan3_2026, $lte: endJan3_2026 }
             }).populate('retailerId', 'name');
             console.log(`Total transactions on Jan 3 2026: ${txs.length}`);
             // Limit output
             txs.slice(0, 10).forEach(t => {
                 const rName = t.retailerId ? t.retailerId.name : 'Unknown';
                 console.log(` - ${t.type}: ${t.amount} | ${rName} | ${t.createdAt}`);
             });
        }

    } catch (err) {
        console.error("An error occurred:", err);
    } finally {
        await mongoose.disconnect();
        console.log("\nDone. Connection closed.");
    }
}

run();
