const mongoose = require('mongoose');
const fs = require('fs');

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const inventorySchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 0 }
});
const Inventory = mongoose.model('Inventory', inventorySchema);

const stockMoveSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: { type: String, enum: ['IN', 'OUT'] },
    quantity: Number
});
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
    try {
        if (!fs.existsSync('stock_rollback_2026_01_01.json')) {
            console.error('Rollback file not found!');
            return;
        }

        const data = JSON.parse(fs.readFileSync('stock_rollback_2026_01_01.json'));
        const moveIds = data.moves;
        
        console.log(`Found ${moveIds.length} moves to rollback.`);
        
        await mongoose.connect(mongoUri);
        console.log('Connected to DB');

        for (const id of moveIds) {
            const move = await StockMove.findById(id);
            if (!move) {
                console.log(`Move ${id} not found, skipping.`);
                continue;
            }

            console.log(`Reversing Move ${id}: ${move.type} ${move.quantity}`);

            const delta = move.type === 'IN' ? -move.quantity : move.quantity;
            
            await Inventory.updateOne(
                { distributorId: move.distributorId, productId: move.productId },
                { $inc: { quantity: delta } }
            );

            await StockMove.deleteOne({ _id: id });
        }

        console.log('Rollback complete.');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
