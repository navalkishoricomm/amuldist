const mongoose = require('mongoose');

const uri = 'mongodb://ujjawaltyagi9627980:T95m7OVzQY13u7J2@ac-fupcash-shard-00-00.vccmheh.mongodb.net:27017,ac-fupcash-shard-00-01.vccmheh.mongodb.net:27017,ac-fupcash-shard-00-02.vccmheh.mongodb.net:27017/amul_dist_app?replicaSet=atlas-g822cr-shard-0&ssl=true&authSource=admin';

const userSchema = new mongoose.Schema({ name: String, role: String }, { strict: false });
const User = mongoose.model('User', userSchema);

const transactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);

const stockMoveSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: String,
    quantity: Number,
    note: String,
    date: Date
}, { timestamps: true });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
    try {
        console.log('Connecting to Remote Atlas DB...');
        await mongoose.connect(uri);
        console.log('Connected.');
        
        const count = await User.countDocuments();
        console.log(`Total Users in DB: ${count}`);

        if (count > 0) {
            const allUsers = await User.find().limit(5);
            allUsers.forEach(u => console.log(`User: ${u.name}, Role: ${u.role}, ID: ${u._id}`));
        }

        // 1. Find Distributor "Anant Sales" or similar
        console.log("Searching for 'Anant'...");
        const users = await User.find({ name: /Anant/i });
        users.forEach(u => console.log(`User: ${u.name} (${u._id}) Role: ${u.role}`));

        let distributorId;
        if (users.length > 0) {
            distributorId = users[0]._id;
        } else {
             // Fallback search for any distributor
             const dists = await User.findOne({ role: 'distributor' });
             if (dists) {
                 console.log(`Fallback: Using first found distributor: ${dists.name} (${dists._id})`);
                 distributorId = dists._id;
             }
        }

        if (!distributorId) {
            console.log("No distributor found.");
            return;
        }

        // 2. Check for the Payment: 3/1/2026 -2301
        // Retailer: 'श्री श्याम डेयरी'
        console.log("Searching for Retailer 'श्री श्याम डेयरी'...");
        const retailer = await User.findOne({ name: /श्री श्याम डेयरी/i, distributorId: distributorId }); // Assuming retailer belongs to dist
        
        if (retailer) {
            console.log(`Found Retailer: ${retailer.name} (${retailer._id})`);
            
            // Search payment
            console.log("Searching for payment -2301...");
            const txs = await Transaction.find({
                retailerId: retailer._id,
                $or: [{ amount: 2301 }, { amount: -2301 }]
            });
            console.log(`Found ${txs.length} transactions with amount 2301/-2301`);
            txs.forEach(t => console.log(JSON.stringify(t)));
        } else {
            console.log("Retailer not found under this distributor. Searching globally...");
            const globRetailer = await User.findOne({ name: /श्री श्याम डेयरी/i });
            if (globRetailer) console.log(`Found Global Retailer: ${globRetailer.name} (${globRetailer._id})`);
        }

        // 3. Check Stock IN for Jan 3 2025
        console.log("Checking Stock IN for Jan 3 2025...");
        const start = new Date('2025-01-03T00:00:00.000Z');
        const end = new Date('2025-01-03T23:59:59.999Z');
        
        const moves = await StockMove.find({
            distributorId,
            type: 'IN',
            createdAt: { $gte: start, $lte: end }
        });
        
        console.log(`Found ${moves.length} IN moves on Jan 3 2025`);
        moves.forEach(m => console.log(`Move: Qty ${m.quantity}, Note: ${m.note}, Created: ${m.createdAt}`));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
