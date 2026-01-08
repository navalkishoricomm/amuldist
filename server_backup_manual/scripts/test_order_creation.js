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

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const pid = new mongoose.Types.ObjectId();
    const rid = new mongoose.Types.ObjectId();
    const did = new mongoose.Types.ObjectId();

    const orderItems = [{
        productId: pid,
        quantity: 10,
        price: 99.5
    }];

    console.log('Creating order with items:', JSON.stringify(orderItems));

    const order = await Order.create({
      retailerId: rid,
      distributorId: did,
      items: orderItems,
      totalAmount: 995,
      status: 'pending'
    });
    
    console.log('Order created ID:', order._id);

    const found = await Order.findById(order._id);
    console.log('Found Order Items:', JSON.stringify(found.items));
    
    if (found.items[0].price === 99.5) {
        console.log('SUCCESS: Price saved correctly');
    } else {
        console.log('FAILURE: Price saved as ' + found.items[0].price);
    }

    // Cleanup
    await Order.deleteOne({ _id: order._id });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
