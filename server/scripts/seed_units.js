const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

const unitSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Simple', 'Compound'], required: true },
    symbol: { type: String, required: true },
    formalName: { type: String },
    decimalPlaces: { type: Number, default: 0 },
    firstUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    secondUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
    conversionFactor: { type: Number },
  },
  { timestamps: true }
);

const Unit = mongoose.model('Unit', unitSchema);

function O(id) {
  return new mongoose.Types.ObjectId(id);
}

function D(iso) {
  return new Date(iso);
}

const simple = [
  {
    _id: O('68a05e961aa07bbc34aaca54'),
    type: 'Simple',
    symbol: 'Kg',
    formalName: 'Kilo',
    decimalPlaces: 0,
    createdAt: D('2025-08-16T10:33:58.208Z'),
  },
  {
    _id: O('68a05ede1aa07bbc34aaca5a'),
    type: 'Simple',
    symbol: 'MCT',
    formalName: 'Milk crate',
    decimalPlaces: 0,
    createdAt: D('2025-08-16T10:35:10.833Z'),
  },
  {
    _id: O('68a1b5de3090fca0853f014b'),
    type: 'Simple',
    symbol: 'Box',
    formalName: 'Box',
    decimalPlaces: 0,
    createdAt: D('2025-08-17T10:58:38.135Z'),
  },
  {
    _id: O('68a493c50f16c9aff95cc514'),
    type: 'Simple',
    symbol: 'Pcs',
    formalName: 'Pisces',
    decimalPlaces: 0,
    createdAt: D('2025-08-19T15:09:57.007Z'),
  },
];

const compound = [
  {
    _id: O('68a1b2f4ea019073c382e972'),
    type: 'Compound',
    symbol: 'MCT/Kg',
    formalName: 'Milk crate per Kilo',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a05e961aa07bbc34aaca54'),
    conversionFactor: 3,
    createdAt: D('2025-08-17T10:46:12.686Z'),
  },
  {
    _id: O('68a2b1ba4b7181b6c608e931'),
    type: 'Compound',
    symbol: 'MCT/Box',
    formalName: 'Milk crate per Box',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a1b5de3090fca0853f014b'),
    conversionFactor: 15,
    createdAt: D('2025-08-18T04:53:14.719Z'),
  },
  {
    _id: O('68a2b1cb4b7181b6c608e937'),
    type: 'Compound',
    symbol: 'MCT/Box',
    formalName: 'Milk crate per Box',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a1b5de3090fca0853f014b'),
    conversionFactor: 12,
    createdAt: D('2025-08-18T04:53:31.167Z'),
  },
  {
    _id: O('68a2c4c6440962a09d36cf98'),
    type: 'Compound',
    symbol: 'MCT/Kg',
    formalName: 'Milk crate per Kilo',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a05e961aa07bbc34aaca54'),
    conversionFactor: 12,
    createdAt: D('2025-08-18T06:14:30.892Z'),
  },
  {
    _id: O('68a493db0f16c9aff95cc51a'),
    type: 'Compound',
    symbol: 'MCT/Pcs',
    formalName: 'Milk crate per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 60,
    createdAt: D('2025-08-19T15:10:19.584Z'),
  },
  {
    _id: O('68a562bf5f1f64d31750c405'),
    type: 'Compound',
    symbol: 'MCT/Pcs',
    formalName: 'Milk crate per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 30,
    createdAt: D('2025-08-20T05:53:03.064Z'),
  },
  {
    _id: O('68a8220dd25c0f0e6ef143af'),
    type: 'Compound',
    symbol: 'MCT/Pcs',
    formalName: 'Milk crate per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 28,
    createdAt: D('2025-08-22T07:53:49.604Z'),
  },
  {
    _id: O('68a8221ad25c0f0e6ef143b5'),
    type: 'Compound',
    symbol: 'MCT/Pcs',
    formalName: 'Milk crate per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 14,
    createdAt: D('2025-08-22T07:54:02.519Z'),
  },
  {
    _id: O('68a8222dd25c0f0e6ef143bb'),
    type: 'Compound',
    symbol: 'MCT/Box',
    formalName: 'Milk crate per Box',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a1b5de3090fca0853f014b'),
    conversionFactor: 6,
    createdAt: D('2025-08-22T07:54:21.632Z'),
  },
  {
    _id: O('68a82260d25c0f0e6ef143c1'),
    type: 'Compound',
    symbol: 'MCT/Pcs',
    formalName: 'Milk crate per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 40,
    createdAt: D('2025-08-22T07:55:12.841Z'),
  },
  {
    _id: O('68a824b513257fc97ea10244'),
    type: 'Compound',
    symbol: 'MCT/Pcs',
    formalName: 'Milk crate per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 26,
    createdAt: D('2025-08-22T08:05:09.007Z'),
  },
  {
    _id: O('68a8250713257fc97ea1024a'),
    type: 'Compound',
    symbol: 'MCT/Pcs',
    formalName: 'Milk crate per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a05ede1aa07bbc34aaca5a'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 32,
    createdAt: D('2025-08-22T08:06:31.877Z'),
  },
  {
    _id: O('68c12dda2b9180ca0215c05a'),
    type: 'Compound',
    symbol: 'Box/Pcs',
    formalName: 'Box per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a1b5de3090fca0853f014b'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 15,
    createdAt: D('2025-09-10T07:50:50.227Z'),
  },
  {
    _id: O('693773395e8a83f6da3de13f'),
    type: 'Compound',
    symbol: 'Box/Pcs',
    formalName: 'Box per Pisces',
    decimalPlaces: 0,
    firstUnit: O('68a1b5de3090fca0853f014b'),
    secondUnit: O('68a493c50f16c9aff95cc514'),
    conversionFactor: 6,
    createdAt: D('2025-12-09T00:54:17.274Z'),
  },
];

async function run() {
  await mongoose.connect(mongoUri);
  let ensured = 0;
  for (const s of simple) {
    await Unit.updateOne({ _id: s._id }, { $setOnInsert: s }, { upsert: true });
    ensured++;
  }
  for (const c of compound) {
    await Unit.updateOne({ _id: c._id }, { $setOnInsert: c }, { upsert: true });
    ensured++;
  }
  console.log(JSON.stringify({ ok: true, insertedOrEnsured: ensured }));
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('seed_units_failed', e && e.message ? e.message : String(e));
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
