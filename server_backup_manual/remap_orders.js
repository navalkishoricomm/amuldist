const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema);

async function remapOrders() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const currentUser = await User.findOne({ email: 'rohitk29@gmail.com' });
    if (!currentUser) throw new Error('Current user (Rohit) not found');
    
    const oldUserId = '693d49ecc4d492a78dbd0e1a'; 
    const oldUserIdObj = new mongoose.Types.ObjectId(oldUserId);
    const newUserId = currentUser._id;

    console.log(`Remapping ORDERS from Old ID (${oldUserId}) to New ID (${newUserId})...`);

    // Remap Orders
    const orderRes = await Order.updateMany(
        { distributorId: oldUserIdObj }, 
        { $set: { distributorId: newUserId } }
    );
    console.log(`Remapped ${orderRes.modifiedCount} Orders (ObjectId match).`);
    
    if (orderRes.modifiedCount === 0) {
         // Try string match just in case
         const orderResStr = await Order.updateMany(
            { distributorId: oldUserId }, 
            { $set: { distributorId: newUserId } }
        );
        console.log(`Remapped ${orderResStr.modifiedCount} Orders (String match).`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

remapOrders();
