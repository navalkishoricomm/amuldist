const mongoose = require('mongoose');

const REMOTE_URI = process.env.MONGODB_URI || "mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function inspectOrphans() {
  try {
    const conn = await mongoose.createConnection(REMOTE_URI).asPromise();
    const Vouchers = conn.collection('vouchers');

    const cashOrphan = await Vouchers.countDocuments({
      cashReceived: { $gt: 0 },
      'previousCashReceived.0': { $exists: false }
    });
    console.log(`Vouchers with cashReceived > 0 but NO previousCashReceived: ${cashOrphan}`);

    const onlineOrphan = await Vouchers.countDocuments({
      onlineReceived: { $ne: 0 },
      'previousOnlineReceived.0': { $exists: false }
    });
    console.log(`Vouchers with onlineReceived != 0 but NO previousOnlineReceived: ${onlineOrphan}`);

    await conn.close();
  } catch (err) {
    console.error(err);
  }
}

inspectOrphans();
