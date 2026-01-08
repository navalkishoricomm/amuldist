
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
    const bindassId = '693773675e8a83f6da3de192';
    const dahiId = '68a8244913257fc97ea1022e';

    // Set Bindass to 6
    await StockMove.create({
        distributorId,
        productId: bindassId,
        type: 'IN',
        quantity: 6,
        date: new Date(),
        note: 'Opening Stock Adjustment (Final)'
    });
    console.log('Set Bindass to 6');

    // Set Dahi to 50
    await StockMove.create({
        distributorId,
        productId: dahiId,
        type: 'IN',
        quantity: 50,
        date: new Date(),
        note: 'Opening Stock Adjustment (Final)'
    });
    console.log('Set Dahi to 50');

    // Update Inventory
    const ids = [bindassId, dahiId];
    for (const pid of ids) {
        const allMoves = await StockMove.find({ distributorId, productId: pid });
        let finalQty = 0;
        for (const m of allMoves) {
            if (m.type === 'IN') finalQty += m.quantity;
            else if (m.type === 'OUT') finalQty -= m.quantity;
        }
        
        await Inventory.findOneAndUpdate(
            { distributorId, productId: pid },
            { quantity: finalQty },
            { upsert: true, new: true }
        );
        console.log(`Updated Inventory for ${pid} to ${finalQty}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
