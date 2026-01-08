const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/amul_dist_app');

const productSchema = new mongoose.Schema({
    nameEnglish: String,
    nameHindi: String,
}, { strict: false });

const stockMoveSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    distributorId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    type: String, // 'IN' or 'OUT'
    createdAt: Date
}, { strict: false });

const Product = mongoose.model('Product', productSchema);
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
    try {
        console.log('Finding products...');
        const products = await Product.find({
            $or: [
                { nameEnglish: { $regex: /Dahi.*Cup.*200/i } },
                { nameHindi: { $regex: /दही.*कप.*200/i } },
                { nameEnglish: { $regex: /Bindass/i } },
                { nameHindi: { $regex: /बिंदास/i } }
            ]
        });

        console.log(`Found ${products.length} products.`);

        const cutoffDate = new Date('2026-01-03T00:00:00.000+05:30'); 
        console.log(`Cutoff Date (JS Date): ${cutoffDate.toISOString()}`);

        for (const p of products) {
            console.log(`\nProduct: ${p.nameEnglish} (${p.nameHindi}) [ID: ${p._id}]`);
            
            const moves = await StockMove.find({
                productId: p._id,
                createdAt: { $lt: cutoffDate }
            }).sort({ createdAt: 1 });

            // Group by distributor
            const distributorBalances = {};

            console.log('--- Moves before Cutoff ---');
            for (const m of moves) {
                const distId = m.distributorId ? m.distributorId.toString() : 'undefined';
                if (!distributorBalances[distId]) distributorBalances[distId] = 0;

                const qty = m.type === 'IN' ? m.quantity : -m.quantity;
                distributorBalances[distId] += qty;
                
                // Only print last few moves or if suspicious
                // console.log(`${m.createdAt.toISOString()} | Dist: ${distId} | ${m.type} | ${m.quantity}`);
            }

            console.log('--- Balances per Distributor ---');
            for (const [distId, balance] of Object.entries(distributorBalances)) {
                console.log(`Distributor: ${distId} | Balance: ${balance}`);
                
                // Check the last moves for this distributor
                const distMoves = moves.filter(m => (m.distributorId ? m.distributorId.toString() : 'undefined') === distId);
                const lastMoves = distMoves.slice(-5);
                console.log(`Last 5 moves for ${distId}:`);
                for(const m of lastMoves) {
                     console.log(`  ${m.createdAt.toISOString()} | ${m.type} | ${m.quantity} | ID: ${m._id}`);
                }
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.connection.close();
    }
}

run();
