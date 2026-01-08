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
  },
  { timestamps: true }
);
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const userSchema = new mongoose.Schema({ name: String }, { strict: false });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({ nameEnglish: String, unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' } }, { strict: false });
const Product = mongoose.model('Product', productSchema);

const unitSchema = new mongoose.Schema({ 
  firstUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  secondUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }
}, { strict: false });
const Unit = mongoose.model('Unit', unitSchema);

const supplierSchema = new mongoose.Schema({ name: String }, { strict: false });
const Supplier = mongoose.model('Supplier', supplierSchema);

async function test() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const count = await StockMove.countDocuments();
    console.log('StockMove count:', count);

    if (count > 0) {
      const items = await StockMove.find({})
        .limit(5)
        .populate('createdByStaffId', 'name')
        .populate('supplierId', 'name')
        .populate('retailerId', 'name')
        .populate({
          path: 'productId',
          select: 'nameEnglish nameHindi unit',
          populate: {
            path: 'unit',
            populate: { path: 'firstUnit secondUnit' }
          }
        })
        .sort({ createdAt: -1 });
      
      console.log('Successfully fetched and populated', items.length, 'items');
      // console.log(JSON.stringify(items[0], null, 2));
    } else {
      console.log('No stock moves to test population');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
