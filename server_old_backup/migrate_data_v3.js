const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  distributorId: mongoose.Schema.Types.ObjectId,
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
  retailerId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    price: Number
  }],
  createdAt: Date
});
const Order = mongoose.model('Order', orderSchema);

const rateSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    distributorId: mongoose.Schema.Types.ObjectId,
    price: Number
}, { timestamps: true });
const Rate = mongoose.model('Rate', rateSchema);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    // 1. Map retailers
    const dist = await User.findOne({ email: 'rohitk29@gmail.com', role: 'distributor' });
    if (!dist) {
      console.error('Distributor rohitk29@gmail.com not found. Skipping retailer mapping.');
    } else {
        console.log('Found distributor:', dist._id, dist.email);
        const res = await User.updateMany(
            { role: 'retailer', distributorId: { $exists: false } }, 
            { $set: { distributorId: dist._id } }
        );
        console.log('Mapped retailers count:', res.modifiedCount);
    }

    // 2. Extract rates
    const orders = await Order.find({}).sort({ createdAt: 1 }); // Oldest to newest
    console.log('Found orders to process:', orders.length);
    
    let ops = 0;
    for (const order of orders) {
        if (!order.distributorId) continue;
        for (const item of order.items) {
            if (item.price && item.price > 0) {
               // Update default rate for this distributor/product
               await Rate.findOneAndUpdate(
                   { distributorId: order.distributorId, productId: item.productId },
                   { price: item.price },
                   { upsert: true, new: true }
               );
               ops++;
            }
        }
    }
    console.log('Rate update operations performed:', ops);

  } catch (err) {
      console.error('Error:', err);
  } finally {
      await mongoose.disconnect();
      console.log('Done');
  }
}

run();
