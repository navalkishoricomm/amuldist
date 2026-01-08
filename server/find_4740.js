const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';
const supplierSchema = new mongoose.Schema({ name: String }, { strict: false });
const Supplier = mongoose.model('Supplier', supplierSchema);
const productSchema = new mongoose.Schema({ nameEnglish: String, nameHindi: String }, { strict: false });
const Product = mongoose.model('Product', productSchema);
const stockMoveSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  type: String,
  quantity: Number,
  note: String,
  createdAt: Date
}, { timestamps: true });
const StockMove = mongoose.model('StockMove', stockMoveSchema);
async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    const sups = await Supplier.find({ name: /rk/i }).limit(5);
    if (!sups.length) {
      console.log('No supplier matched RK');
      return;
    }
    const getRange = (y, m, d) => {
      const s = new Date(y, m - 1, d, 0, 0, 0, 0);
      const e = new Date(y, m - 1, d, 23, 59, 59, 999);
      return { s, e };
    };
    const days = [
      getRange(2026, 1, 7),
      getRange(2026, 1, 8)
    ];
    for (const sup of sups) {
      console.log(`Supplier: ${sup.name} ${sup._id}`);
      for (const r of days) {
        const moves = await StockMove.find({
          supplierId: sup._id,
          type: 'OUT',
          createdAt: { $gte: r.s, $lte: r.e }
        }).populate('productId', 'nameEnglish nameHindi');
        const agg = {};
        moves.forEach(m => {
          const pid = String(m.productId || m.productId?._id || m.productId);
          agg[pid] = (agg[pid] || 0) + Number(m.quantity || 0);
        });
        console.log(`Date ${r.s.toISOString().slice(0,10)} OUT count: ${moves.length}`);
        Object.keys(agg).forEach(pid => {
          const m = moves.find(x => String(x.productId?._id || x.productId) === pid);
          const name = m && m.productId ? (m.productId.nameEnglish || m.productId.nameHindi || pid) : pid;
          console.log(`- ${name}: ${agg[pid]}`);
        });
      }
    }
    for (const r of days) {
      const m2 = await StockMove.find({
        type: 'OUT',
        note: /supplier/i,
        createdAt: { $gte: r.s, $lte: r.e }
      }, { supplierId: 1, quantity: 1, productId: 1, note: 1, createdAt: 1 }).limit(50);
      const withSup = m2.filter(x => x.supplierId).length;
      const withoutSup = m2.length - withSup;
      console.log(`All OUT with note containing SUPPLIER on ${r.s.toISOString().slice(0,10)}: ${m2.length} (with supplierId: ${withSup}, without: ${withoutSup})`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
