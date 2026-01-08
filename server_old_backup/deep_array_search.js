const mongoose = require('mongoose');

const REMOTE_URI = 'mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
  try {
    const conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    console.log('Connected to Remote DB');

    const Voucher = conn.model('vouchers', new mongoose.Schema({}, { strict: false }));

    // 1. Search deep in arrays for 3724
    console.log('Searching in previousCashReceived/OnlineReceived arrays for 3724...');
    const deepMatches = await Voucher.find({
        $or: [
            { "previousCashReceived.amount": 3724 },
            { "previousOnlineReceived.amount": 3724 }
        ]
    });

    if (deepMatches.length > 0) {
        console.log(`FOUND ${deepMatches.length} vouchers with 3724 in arrays!`);
        deepMatches.forEach(v => {
            console.log(`\n--- Voucher ID: ${v._id} ---`);
            console.log(`Date: ${v.date}`);
            console.log(`PartyId: ${v.partyId}`);
            console.log(`Top-level Cash: ${v.cashReceived}`);
            
            if (v.previousCashReceived) {
                console.log('Previous Cash Entries:');
                v.previousCashReceived.forEach(p => console.log(`  - Amount: ${p.amount}, Date: ${p.createdAt}`));
            }
            if (v.previousOnlineReceived) {
                console.log('Previous Online Entries:');
                v.previousOnlineReceived.forEach(p => console.log(`  - Amount: ${p.amount}, Date: ${p.createdAt}`));
            }
        });
    } else {
        console.log('Not found in arrays either.');
    }

    // 2. Dump all vouchers for New Pawan on 24/11/2025 again to see structure
    const Retailer = conn.model('partystockouts', new mongoose.Schema({}, { strict: false }));
    const retailer = await Retailer.findOne({ name: { $regex: 'न्यू पवन', $options: 'i' } });
    
    if (retailer) {
        console.log(`\n--- Inspecting Vouchers for ${retailer.name} on 24/11/2025 ---`);
        const start = new Date('2025-11-23T18:30:00Z'); // IST 24th start
        const end = new Date('2025-11-24T18:29:59Z');   // IST 24th end
        // Adjust query to be loose on date
        const vouchers = await Voucher.find({
            partyId: retailer._id,
            date: { $gte: new Date('2025-11-23'), $lte: new Date('2025-11-25') }
        });
        
        vouchers.forEach(v => {
            console.log(`\nID: ${v._id}, Date: ${v.date}`);
            console.log(`Total: ${v.totalAmount}`);
            console.log(`Cash: ${v.cashReceived}`);
            console.log(`Online: ${v.onlineReceived}`);
            console.log(`PrevCash: ${JSON.stringify(v.previousCashReceived)}`);
            console.log(`PrevOnline: ${JSON.stringify(v.previousOnlineReceived)}`);
        });
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
