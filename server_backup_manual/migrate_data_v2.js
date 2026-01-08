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

const rateSchema = new mongoose.Schema({
  productId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  price: Number,
}, { timestamps: true });
const Rate = mongoose.model('Rate', rateSchema);

const orderSchema = new mongoose.Schema({
  retailerId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    price: Number
  }],
  createdAt: Date
});
const Order = mongoose.model('Order', orderSchema);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const targetEmail = 'rohitk29@gmail.com';
    const distributor = await User.findOne({ email: targetEmail, role: 'distributor' });
    
    if (!distributor) {
      console.error(`Distributor ${targetEmail} not found!`);
      // check if maybe role is wrong or email is slightly different
      const user = await User.findOne({ email: targetEmail });
      if (user) {
        console.log(`User found but role is ${user.role}. Updating to distributor...`);
        user.role = 'distributor';
        await user.save();
        console.log('User role updated to distributor.');
      } else {
         console.error('User does not exist at all.');
         process.exit(1);
      }
    }
    
    // Refetch to be sure
    const dist = await User.findOne({ email: targetEmail });
    console.log(`Target Distributor: ${dist.name} (${dist._id})`);

    // 1. Map all retailers to this distributor
    const res = await User.updateMany(
      { role: 'retailer' },
      { $set: { distributorId: dist._id } }
    );
    console.log(`Updated ${res.modifiedCount} retailers to map to ${dist.name}`);

    // 2. Extract rates from orders
    // Find all orders for this distributor (or all orders if we assume they belong to this context)
    // The user said "map all retailer under distributor rohitk29", implies he is the main/only one now.
    // So we can look at all orders or just his orders. I'll look at all orders to be safe/comprehensive if we are consolidating.
    const orders = await Order.find({}).sort({ createdAt: 1 }); // Process oldest to newest to let newest overwrite
    
    console.log(`Found ${orders.length} orders to process for rates.`);
    
    const productPrices = {}; // productId -> price

    for (const order of orders) {
      if (!order.items) continue;
      for (const item of order.items) {
        if (item.price && item.price > 0) {
          productPrices[item.productId.toString()] = item.price;
        }
      }
    }

    console.log(`Found ${Object.keys(productPrices).length} unique products with prices.`);

    for (const [prodId, price] of Object.entries(productPrices)) {
      await Rate.findOneAndUpdate(
        { productId: prodId, distributorId: dist._id },
        { price: price },
        { upsert: true, new: true }
      );
    }
    console.log('Rates updated successfully.');

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
