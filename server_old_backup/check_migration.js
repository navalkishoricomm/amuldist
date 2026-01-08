const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const rateSchema = new mongoose.Schema({
    productId: mongoose.Schema.Types.ObjectId,
    distributorId: mongoose.Schema.Types.ObjectId,
    price: Number
}, { timestamps: true });
const Rate = mongoose.model('Rate', rateSchema);

async function check() {
  try {
    await mongoose.connect(mongoUri);
    const count = await Rate.countDocuments({});
    console.log('Total Rates:', count);
    const sample = await Rate.findOne({});
    console.log('Sample Rate:', sample);
  } catch (err) {
      console.error(err);
  } finally {
      await mongoose.disconnect();
  }
}

check();
