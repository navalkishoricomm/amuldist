const mongoose = require('mongoose');
const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const stockMoveSchema = new mongoose.Schema({
    distributorId: mongoose.Schema.Types.ObjectId,
    productId: mongoose.Schema.Types.ObjectId,
    type: String,
    quantity: Number,
    date: Date,
    createdAt: Date,
    note: String
});
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function run() {
    try {
        await mongoose.connect(mongoUri);
        const moves = await StockMove.find({ distributorId: '6893635d853effc40396cfb3' }).sort({date: -1}).limit(5);
        console.log('Recent Moves:');
        moves.forEach(m => console.log(`${m.date ? m.date.toISOString() : 'NoDate'} - ${m.type} ${m.quantity} (${m.note})`));
        
        const moves2026 = await StockMove.countDocuments({ 
            distributorId: '6893635d853effc40396cfb3', 
            date: { $gte: new Date('2026-01-01') } 
        });
        console.log(`Moves in 2026: ${moves2026}`);
        
    } catch (err) { console.error(err); } 
    finally { await mongoose.disconnect(); }
}
run();
