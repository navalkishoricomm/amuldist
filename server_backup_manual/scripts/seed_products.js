const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

const productSchema = new mongoose.Schema(
  {
    nameEnglish: { type: String, required: true, trim: true, unique: true },
    nameHindi: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.pre('save', function () {
  this.nameHindi = this.nameEnglish;
});

productSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() || {};
  if (update.nameEnglish) update.nameHindi = update.nameEnglish;
});

const Product = mongoose.model('Product', productSchema);

const names = [
  'फुल क्रीम गोल्ड 1 किलो',
  'फुल क्रीम गोल्ड 500 ग्राम',
  'टोंड ताजा 1 किलो',
  'टोंड ताजा 500 ग्राम',
  'गाय 1 किलो',
  'गाय 500 ग्राम',
  'गाय का बच्चा',
  'भैंस 1 किलो',
  'भैंस 500 ग्राम',
  'टी स्पेशल 1 किलो',
  'टी स्पेशल 500 ग्राम',
  'गिर गाय 1 किलो',
  'दही 1 किलो',
  'दही 400 ग्राम',
  'दही 200 ग्राम',
  'दही कप 100 ग्राम',
  'दही कप 200 ग्राम',
  'दही कप 400 ग्राम',
  'छाछ ₹10',
  'मीठी लस्सी',
  'तड़का छाछ',
  'मुन्ना मक्खन',
  'पनीर 200 ग्राम',
  'ब्रेड 20',
  'दही 850 ग्राम',
  'लस्सी 500 ग्राम',
  'दही मटका 15 किलो',
  'बिंदास चॉकलेट',
];

async function run() {
  await mongoose.connect(mongoUri);
  let created = 0;
  for (const n of names) {
    const nameEnglish = String(n).trim();
    if (!nameEnglish) continue;
    try {
      await Product.updateOne(
        { nameEnglish },
        { $setOnInsert: { nameEnglish, nameHindi: nameEnglish, active: true } },
        { upsert: true }
      );
      created++;
    } catch (_) {}
  }
  console.log(JSON.stringify({ ok: true, insertedOrEnsured: created }));
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('seed_failed', e && e.message ? e.message : String(e));
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

