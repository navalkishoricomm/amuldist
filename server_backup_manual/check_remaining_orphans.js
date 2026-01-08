const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema);

async function checkRemaining() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const oldUserId = new mongoose.Types.ObjectId('693d49ecc4d492a78dbd0e1a');

    // Check Products
    const prodCount = await Product.countDocuments({ distributorId: oldUserId });
    console.log(`Remaining Products for Old ID: ${prodCount}`);

    // Check Suppliers (Users)
    const suppCount = await User.countDocuments({ role: 'supplier', distributorId: oldUserId });
    console.log(`Remaining Suppliers for Old ID: ${suppCount}`);

    // Check Staff (Users)
    const staffCount = await User.countDocuments({ role: 'staff', distributorId: oldUserId });
    console.log(`Remaining Staff for Old ID: ${staffCount}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkRemaining();
