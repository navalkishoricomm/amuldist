const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema);

const stockMoveSchema = new mongoose.Schema({}, { strict: false });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const transactionSchema = new mongoose.Schema({}, { strict: false });
const Transaction = mongoose.model('Transaction', transactionSchema);

async function createDummy() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected');

    const distributor = await User.findOne({ email: 'rohitk29@gmail.com' });
    if (!distributor) throw new Error('Distributor not found');

    const product = await Product.findOne();
    if (!product) {
       console.log('No products found. Creating one...');
       await Product.create({ nameEnglish: 'Test Milk', nameHindi: 'Test Milk', active: true });
    }
    const p = await Product.findOne();

    console.log('Creating dummy stock move...');
    await StockMove.create({
      distributorId: distributor._id,
      productId: p._id,
      type: 'IN',
      quantity: 100,
      note: 'Initial Dummy Stock',
      createdAt: new Date()
    });
    
    console.log('Dummy stock move created.');

    const retailer = await User.findOne({ role: 'retailer', distributorId: distributor._id });
    if (retailer) {
        console.log('Creating dummy transaction for retailer:', retailer.name);
        await Transaction.create({
            distributorId: distributor._id,
            retailerId: retailer._id,
            type: 'order',
            amount: 500,
            note: 'Dummy Order',
            createdAt: new Date()
        });
        console.log('Dummy transaction created.');
    } else {
        console.log('No retailer found to create transaction.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

createDummy();
