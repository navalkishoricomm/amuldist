const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const orderSchema = new mongoose.Schema(
  {
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'delivered'], default: 'pending' },
    note: { type: String }
  },
  { timestamps: true }
);
const Order = mongoose.model('Order', orderSchema);

async function inspect() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
    console.log(`Found ${orders.length} recent orders`);

    orders.forEach(o => {
      console.log(`Order ID: ${o._id}, Date: ${o.createdAt}, Total: ${o.totalAmount}`);
      o.items.forEach((item, i) => {
        console.log(`  Item ${i + 1}: ProductId: ${item.productId}, Qty: ${item.quantity}, Price: ${item.price}`);
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
