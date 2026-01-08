const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const userSchema = new mongoose.Schema({ name: String, role: String }, { strict: false });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({ nameEnglish: String }, { strict: false });
const Product = mongoose.model('Product', productSchema);

const stockMoveSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: String,
    quantity: Number,
    note: String
}, { timestamps: true });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
  try {
    // Force local DB as per user instruction
    const uri = 'mongodb://127.0.0.1:27017/amul_dist_app';
    // const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';
    console.log(`Connecting to: ${uri}`);
    await mongoose.connect(uri);
    console.log('Connected to DB');

    console.log("Listing all users with role 'distributor':");
    const dists = await User.find({ role: 'distributor' });
    console.log(`Found ${dists.length} distributors.`);
    dists.forEach(d => console.log(`Distributor: ${d.name} (${d._id})`));

    const totalUsers = await User.countDocuments();
    console.log(`Total users in DB: ${totalUsers}`);
    if (totalUsers > 0) {
        console.log("First 5 users:");
        const users = await User.find().limit(5);
        users.forEach(u => console.log(JSON.stringify(u)));
    }

    // Try to find Anant
    let user = dists.find(d => d.name.match(/Anant/i));
    if (!user) {
        console.log("Anant not found in distributors. Searching all users...");
        const all = await User.find({ name: /Anant/i });
        all.forEach(u => console.log(`Match: ${u.name} (${u._id}) Role: ${u.role}`));
        if (all.length > 0) user = all[0];
    }

    if (!user) {
        console.log("User 'Anant Sales' not found.");
        return;
    }
    console.log(`Checking StockMoves for: ${user.name} (${user._id})`);

    const checkDateRange = async (start, end, label) => {
        console.log(`--- Checking ${label} ---`);
        console.log(`Range: ${start.toISOString()} to ${end.toISOString()}`);
        
        const moves = await StockMove.find({
            distributorId: user._id,
            type: 'IN',
            createdAt: { $gte: start, $lte: end }
        }).populate('productId', 'nameEnglish').sort({ createdAt: 1 });

        console.log(`Found ${moves.length} IN moves.`);
        let total = 0;
        for (const m of moves) {
            const pName = m.productId ? m.productId.nameEnglish : 'Unknown';
            console.log(`${m.createdAt.toISOString()} | ${pName.padEnd(20)} | Qty: ${m.quantity} | Note: ${m.note}`);
            total += m.quantity;
        }
        console.log(`Total IN quantity: ${total}`);
    };

    // Check broader range (last 48 hours from now)
    const now = new Date();
    const startRecent = new Date(now);
    startRecent.setDate(startRecent.getDate() - 2);
    
    console.log("--- Checking Recent 48 Hours ---");
    const moves = await StockMove.find({
        distributorId: user._id,
        createdAt: { $gte: startRecent }
    }).populate('productId', 'nameEnglish').sort({ createdAt: -1 });

    console.log(`Found ${moves.length} recent moves.`);
    for (const m of moves) {
        const pName = m.productId ? m.productId.nameEnglish : 'Unknown';
        console.log(`${m.createdAt.toISOString()} | ${m.type} | ${pName.padEnd(20)} | Qty: ${m.quantity} | Note: ${m.note}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
