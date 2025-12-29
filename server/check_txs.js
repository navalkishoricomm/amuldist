
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/amul_dist_app')
  .then(async () => {
    console.log('Connected');
    const transactionSchema = new mongoose.Schema({
        retailerId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        type: String
    }, { strict: false });
    const Transaction = mongoose.model('Transaction', transactionSchema);

    const retailerId = '68a889ca39ca8ae64e1fe846';
    const txs = await Transaction.find({ retailerId: retailerId });
    console.log(`Transactions for retailer ${retailerId}:`, txs.length);
    if (txs.length > 0) console.log(txs[0]);

    mongoose.disconnect();
  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
