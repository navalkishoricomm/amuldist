const mongoose = require('mongoose');

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

// Define schema with both English and Hindi names to maximize matching chances
const productSchema = new mongoose.Schema({
  nameEnglish: { type: String, required: true },
  nameHindi: { type: String },
  baseName: { type: String },
  variantName: { type: String },
  variantGroup: { type: String }
});

const Product = mongoose.model('Product', productSchema);

// Custom Grouping Logic
function getCustomGrouping(name) {
    // Normalize: Remove extra spaces
    const n = name.trim();
    
    // Rule 1: "गाय" and "गाय का बच्चा" -> Group: "गाय"
    // Checks if name contains "गाय" (matches both "गाय" and "गाय का बच्चा")
    if (n.includes('गाय')) {
        let variant = '';
        
        // Specific override per user request
        if (n.includes('गाय का बच्चा')) {
            variant = 'गाय का बच्चा';
        } else {
            variant = n.replace('गाय', '').trim();
            if (!variant) variant = 'Base'; 
        }
        return { base: 'गाय', variant: variant };
    }

    // Rule 2: "छाछ" Group
    // Includes: "छाछ ₹10", "तड़का छाछ", "लस्सी 500 ग्राम", "लस्सी मीठी"
    if (n.includes('छाछ') || n.includes('लस्सी')) {
        const base = 'छाछ';
        let variant = '';

        // If it's Lassi, we keep "Lassi" in the variant name
        if (n.includes('लस्सी')) {
            variant = n; // e.g. "लस्सी 500 ग्राम"
        } else {
            // It is Chhach.
            // Specific override per user request
            if (n.includes('₹10')) {
                variant = 'छाछ ₹10';
            } else {
                variant = n.replace('छाछ', '').trim();
                if (!variant) variant = 'Base';
            }
        }
        return { base: base, variant: variant };
    }

    return null;
}

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const products = await Product.find({});
    console.log(`Found ${products.length} products. Running smart migration...`);

    let updatedCount = 0;
    
    // Regex for English units
    const unitsEn = 'ml|l|ltr|liter|liters|kg|g|gm|gms|gram|grams|pcs|pc|packet|pkt|box|carton|bag|pouch';
    // Regex for Hindi units (unicode characters)
    const unitsHi = 'किलो|ग्राम|ली|ली.|लीटर|मिली|पीस|पैकेट|बॉक्स|पेटी|नग|पाउच';
    
    // Combined regex: Looks for " <number>[.]<number> <unit>" at the end of string
    const regex = new RegExp(`\\s+(\\d+(\\.\\d+)?\\s*(${unitsEn}|${unitsHi}))\\s*$`, 'i');

    for (const p of products) {
        let match = null;
        let sourceName = p.nameEnglish; // Default to English

        // 0. Check Custom Rules First (Priority)
        // We check against nameHindi first as that's where the scripts usually are, 
        // but if missing, check nameEnglish.
        const nameToCheck = p.nameHindi || p.nameEnglish;
        const custom = getCustomGrouping(nameToCheck);

        if (custom) {
            p.baseName = custom.base;
            p.variantName = custom.variant;
            console.log(`[Custom] "${nameToCheck}" -> Base: "${p.baseName}", Variant: "${p.variantName}"`);
        } else {
            // Standard Regex Logic
            
            // 1. Try matching on nameEnglish
            match = p.nameEnglish.match(regex);
            
            // 2. If no match, try matching on nameHindi (if it exists)
            if (!match && p.nameHindi) {
                match = p.nameHindi.match(regex);
                if (match) {
                    sourceName = p.nameHindi; // Use Hindi name for splitting
                }
            }

            if (match) {
                p.variantName = match[1]; // The captured volume/weight
                p.baseName = sourceName.substring(0, match.index).trim();
            } else {
                // No variant found -> Base is the full name
                p.baseName = p.nameEnglish;
                p.variantName = '';
            }
        }
        
        // Generate a grouping key from the Base Name
        p.variantGroup = p.baseName.toLowerCase().replace(/\s+/g, '_');

        await p.save();
        updatedCount++;
        // Only log non-custom updates to avoid spam
        if (!custom) {
             // console.log(`[Regex] "${p.nameEnglish}" -> Base: "${p.baseName}", Variant: "${p.variantName}"`);
        }
    }

    console.log(`Migration complete. Processed ${updatedCount} products.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
