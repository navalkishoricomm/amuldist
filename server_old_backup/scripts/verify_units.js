const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Force local DB to match app's hardcoded URI
const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const unitSchema = new mongoose.Schema({
  type: { type: String, enum: ['Simple', 'Compound'], required: true },
  symbol: { type: String, required: true },
  formalName: { type: String },
  decimalPlaces: { type: Number, default: 0 },
  firstUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  secondUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  conversionFactor: { type: Number },
}, { timestamps: true });

const Unit = mongoose.model('Unit', unitSchema);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    const units = await Unit.find({ symbol: { $regex: /MCT|Milk/i } }).select('symbol type');
    console.log('Units found:', JSON.stringify(units, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
