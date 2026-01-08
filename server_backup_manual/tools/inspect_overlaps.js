const mongoose = require('mongoose');

const REMOTE_URI = process.env.MONGODB_URI || "mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function inspectOverlaps() {
  try {
    const conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const Vouchers = conn.collection('vouchers');

    // Find vouchers with both cashReceived > 0 and previousCashReceived not empty
    const cashOverlap = await Vouchers.findOne({
      cashReceived: { $gt: 0 },
      'previousCashReceived.0': { $exists: true }
    });

    if (cashOverlap) {
      console.log('--- Cash Overlap Sample ---');
      console.log(`ID: ${cashOverlap._id}`);
      console.log(`cashReceived: ${cashOverlap.cashReceived}`);
      console.log('previousCashReceived:', JSON.stringify(cashOverlap.previousCashReceived, null, 2));
    } else {
      console.log('No vouchers found with both cashReceived > 0 and previousCashReceived entries.');
    }

    // Find vouchers with both onlineReceived != 0 and previousOnlineReceived not empty
    const onlineOverlap = await Vouchers.findOne({
      onlineReceived: { $ne: 0 }, // Check non-zero
      'previousOnlineReceived.0': { $exists: true }
    });

    if (onlineOverlap) {
      console.log('\n--- Online Overlap Sample ---');
      console.log(`ID: ${onlineOverlap._id}`);
      console.log(`onlineReceived: ${onlineOverlap.onlineReceived}`);
      console.log('previousOnlineReceived:', JSON.stringify(onlineOverlap.previousOnlineReceived, null, 2));
    } else {
        console.log('No vouchers found with both onlineReceived != 0 and previousOnlineReceived entries.');
    }

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

inspectOverlaps();
