
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const productSchema = new mongoose.Schema({
  nameEnglish: String,
  nameHindi: String
});
const Product = mongoose.model('Product', productSchema);

async function run() {
  await mongoose.connect(mongoUri);
  try {
    const names = ['बिंदास चॉकलेट', 'दही कप 200 ग्राम', 'मुन्ना मक्खन'];
    const products = await Product.find({
      $or: [
        { nameHindi: { $in: names } },
        { nameEnglish: { $in: names } } // Just in case
      ]
    });
    console.log('Found products:', products);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
