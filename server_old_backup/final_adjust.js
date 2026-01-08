
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const stockMoveSchema = new mongoose.Schema(
  {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    createdByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true },
    note: { type: String },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const inventorySchema = new mongoose.Schema(
    {
      distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
  );
const Inventory = mongoose.model('Inventory', inventorySchema);

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  try {
    const distributorId = '6893635d853effc40396cfb3';
    
    // IDs from previous inspection
    const bindassId = '693773675e8a83f6da3de192';
    const dahiId = '68a8244913257fc97ea1022e';

    const targets = [
        { id: bindassId, target: 6, name: 'Bindass Chocolate' },
        { id: dahiId, target: 50, name: 'Dahi Cup 200g' }
    ];

    for (const t of targets) {
        // Calculate Current Stock
        const allMoves = await StockMove.find({ distributorId, productId: t.id });
        let currentQty = 0;
        for (const m of allMoves) {
            if (m.type === 'IN') currentQty += m.quantity;
            else if (m.type === 'OUT') currentQty -= m.quantity;
        }

        const diff = t.target - currentQty;
        
        if (diff !== 0) {
            const type = diff > 0 ? 'IN' : 'OUT';
            const qty = Math.abs(diff);
            
            await StockMove.create({
                distributorId,
                productId: t.id,
                type,
                quantity: qty,
                date: new Date(),
                note: 'Final Adjustment to Target'
            });
            console.log(`${t.name}: Current ${currentQty} -> Target ${t.target}. Added ${type} ${qty}`);
            
            // Update Inventory
            await Inventory.findOneAndUpdate(
                { distributorId, productId: t.id },
                { quantity: t.target },
                { upsert: true, new: true }
            );
        } else {
            console.log(`${t.name}: Already at target ${currentQty}`);
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
