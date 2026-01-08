const mongoose = require('mongoose');
const { Schema } = mongoose;

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const unitSchema = new Schema({
  type: { type: String, enum: ['Simple', 'Compound'], required: true },
  symbol: { type: String, required: true },
  formalName: { type: String },
  decimalPlaces: { type: Number, default: 0 },
  firstUnit: { type: Schema.Types.ObjectId, ref: 'Unit' },
  secondUnit: { type: Schema.Types.ObjectId, ref: 'Unit' },
  conversionFactor: { type: Number },
}, { timestamps: true });
const Unit = mongoose.model('Unit', unitSchema);

const productSchema = new Schema({
  nameEnglish: String,
  unit: { type: Schema.Types.ObjectId, ref: 'Unit' }
}, { strict: false });
const Product = mongoose.model('Product', productSchema);

async function run() {
  await mongoose.connect(mongoUri);
  
  // 1. Ensure 'Pack' exists
  let pack = await Unit.findOne({ symbol: 'Pack' });
  if (!pack) {
    pack = await Unit.create({ type: 'Simple', symbol: 'Pack', formalName: 'Pack' });
    console.log('Created Pack');
  } else {
    console.log('Pack exists');
  }

  // 2. Ensure 'Crate' exists (1 Crate = 12 Packs)
  let crate = await Unit.findOne({ symbol: 'Crate' });
  if (!crate) {
    crate = await Unit.create({
      type: 'Compound',
      symbol: 'Crate',
      formalName: 'Crate',
      firstUnit: null, // or self? usually compound logic relies on secondUnit + factor
      secondUnit: pack._id,
      conversionFactor: 12
    });
    console.log('Created Crate (12 Packs)');
  } else {
    console.log('Crate exists');
  }

  // 3. Assign Crate to 'Amul Gold 500ml' if exists
  const p = await Product.findOne({ nameEnglish: 'Amul Gold 500ml' });
  if (p) {
    p.unit = crate._id;
    await p.save();
    console.log('Assigned Crate unit to Amul Gold 500ml');
  }

  await mongoose.disconnect();
}

run().catch(console.error);