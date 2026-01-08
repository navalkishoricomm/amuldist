
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

const productSchema = new mongoose.Schema({
  nameEnglish: String,
  nameHindi: String
});
const Product = mongoose.model('Product', productSchema);

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
    
    // Define Targets
    const targetMap = {
        '?????????????????? ??????????????????': 6,
        '????????? ?????? 200 ???????????????': 50
    };
    // All others 0

    // Get all products
    const moves = await StockMove.find({ distributorId }).distinct('productId');
    
    // Also get IDs for targets to be sure
    const targetNames = Object.keys(targetMap);
    const targetProducts = await Product.find({ nameHindi: { $in: targetNames } });
    
    const productMap = {}; // ID -> Name
    const idToTarget = {}; // ID -> Qty
    
    targetProducts.forEach(p => {
        productMap[p._id.toString()] = p.nameHindi;
        idToTarget[p._id.toString()] = targetMap[p.nameHindi];
    });

    const allProductIds = new Set([...moves.map(id => id.toString()), ...Object.keys(idToTarget)]);
    
    console.log(`Checking ${allProductIds.size} products for final adjustment...`);

    for (const pid of allProductIds) {
        // Calculate Current Stock (Total)
        const allMoves = await StockMove.find({ distributorId, productId: pid });
        let currentQty = 0;
        for (const m of allMoves) {
            if (m.type === 'IN') currentQty += m.quantity;
            else if (m.type === 'OUT') currentQty -= m.quantity;
        }

        // Determine Target
        const targetQty = idToTarget[pid] || 0;
        
        // Calculate Difference
        const diff = targetQty - currentQty;
        
        if (diff !== 0) {
            const type = diff > 0 ? 'IN' : 'OUT';
            const qty = Math.abs(diff);
            
            await StockMove.create({
                distributorId,
                productId: pid,
                type,
                quantity: qty,
                date: new Date(), // Now
                note: 'Final Stock Reset to Target'
            });
            console.log(`Product ${pid} (${productMap[pid] || 'Other'}): Current ${currentQty} -> Target ${targetQty}. Added ${type} ${qty}`);
            
            // Update Current for Inventory
            currentQty += diff;
        } else {
            // console.log(`Product ${pid}: Match ${currentQty}`);
        }

        // Update Inventory
        await Inventory.findOneAndUpdate(
            { distributorId, productId: pid },
            { quantity: currentQty },
            { upsert: true, new: true }
        );
    }
    console.log('All stocks synchronized to targets.');

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
