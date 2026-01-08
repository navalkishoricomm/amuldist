const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';

const stockMoveSchema = new mongoose.Schema({
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    type: String,
    quantity: Number,
    note: String,
    createdAt: Date
}, { timestamps: true });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

const productSchema = new mongoose.Schema({
    nameEnglish: String,
    nameHindi: String
});
const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({ name: String, role: String });
const User = mongoose.model('User', userSchema);

async function generateReport(dateStr) {
    try {
        console.log(`Connecting to MongoDB...`);
        await mongoose.connect(MONGO_URI);
        console.log('Connected.');

        // 1. Find Distributor
        const dist = await User.findOne({ name: /Anant/i, role: 'distributor' });
        if (!dist) {
            console.error("Distributor 'Anant' not found.");
            return;
        }
        console.log(`Generating Report for: ${dist.name} (${dist._id})`);
        console.log(`Target Date (IST): ${dateStr}`);

        // 2. Define Timezones (IST)
        // Date string format: "YYYY-MM-DD"
        // Start of Day IST: 00:00 IST = Prev Day 18:30 UTC
        const targetDate = new Date(dateStr);
        
        // Start: 00:00 IST -> UTC
        const startUTC = new Date(targetDate);
        startUTC.setHours(0,0,0,0);
        startUTC.setMinutes(startUTC.getMinutes() - 330); // -5.5 hours

        // End: 23:59:59.999 IST -> UTC
        const endUTC = new Date(startUTC);
        endUTC.setTime(endUTC.getTime() + 86400000 - 1); // +24h - 1ms

        console.log(`Query Range (UTC): ${startUTC.toISOString()} to ${endUTC.toISOString()}`);

        // 3. Get Products
        const products = await Product.find({}).sort({ nameEnglish: 1 });
        const report = {};

        // Initialize
        products.forEach(p => {
            report[p._id] = {
                name: p.nameEnglish,
                opening: 0,
                in: 0,
                out: 0,
                closing: 0
            };
        });

        // 4. Calculate Opening Stock (All moves strictly BEFORE startUTC)
        console.log("Calculating Opening Stock...");
        const openingMoves = await StockMove.find({
            distributorId: dist._id,
            createdAt: { $lt: startUTC }
        });

        openingMoves.forEach(m => {
            if (report[m.productId]) {
                if (m.type === 'IN') report[m.productId].opening += m.quantity;
                else if (m.type === 'OUT') report[m.productId].opening -= m.quantity;
            }
        });

        // 5. Calculate Daily Moves (Between startUTC and endUTC)
        console.log("Calculating Daily Stock IN/OUT...");
        const dailyMoves = await StockMove.find({
            distributorId: dist._id,
            createdAt: { $gte: startUTC, $lte: endUTC }
        });

        dailyMoves.forEach(m => {
            if (report[m.productId]) {
                if (m.type === 'IN') report[m.productId].in += m.quantity;
                else if (m.type === 'OUT') report[m.productId].out += m.quantity;
            }
        });

        // 6. Calculate Closing and Print
        console.log("\n--------------------------------------------------------------------------------");
        console.log(`PRODUCT WISE REPORT (${dateStr})`);
        console.log("--------------------------------------------------------------------------------");
        console.log(pad("Product Name", 30) + " | " + pad("Opening", 10) + " | " + pad("Stock IN", 10) + " | " + pad("Stock OUT", 10) + " | " + pad("Closing", 10));
        console.log("--------------------------------------------------------------------------------");

        let hasData = false;
        for (const pid of Object.keys(report)) {
            const r = report[pid];
            r.closing = r.opening + r.in - r.out;

            // Only show if there's any activity or non-zero stock
            if (r.opening !== 0 || r.in !== 0 || r.out !== 0 || r.closing !== 0) {
                hasData = true;
                console.log(pad(r.name, 30) + " | " + pad(r.opening, 10) + " | " + pad(r.in, 10) + " | " + pad(r.out, 10) + " | " + pad(r.closing, 10));
            }
        }
        
        if (!hasData) {
            console.log("No stock data found for any product.");
        }
        console.log("--------------------------------------------------------------------------------\n");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

function pad(str, len) {
    str = String(str);
    return str.length < len ? str + " ".repeat(len - str.length) : str.substring(0, len);
}

// Check for args
const dateArg = process.argv[2] || '2026-01-03';
generateReport(dateArg);
