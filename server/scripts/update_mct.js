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
    console.log('Connected to DB');

    // 1. Update Simple unit "Milk crt" or "Milk Crt" to "MCT"
    // We use updateMany just in case, though there should be only one if unique
    const resSimple = await Unit.updateMany(
      { symbol: { $in: ['Milk crt', 'Milk Crt'] } },
      { $set: { symbol: 'MCT' } }
    );
    console.log('Updated Simple units:', resSimple);

    // 2. Update Compound units that have "Milk crt" or "Milk Crt" in their symbol string
    // We'll use a regex to find them
    const compounds = await Unit.find({ 
      type: 'Compound', 
      symbol: { $regex: /Milk crt/i } // case insensitive
    });
    
    console.log(`Found ${compounds.length} compound units to check.`);

    for (const u of compounds) {
      // Replace case-insensitively
      const newSym = u.symbol.replace(/Milk crt/i, 'MCT');
      if (newSym !== u.symbol) {
        u.symbol = newSym;
        await u.save();
        console.log(`Updated compound unit ${u._id} symbol to ${newSym}`);
      }
    }

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
