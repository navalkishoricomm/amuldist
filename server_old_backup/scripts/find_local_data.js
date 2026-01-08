const mongoose = require('mongoose');

const mongoUri = 'mongodb://localhost:27017/amul_dist_app';

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const distributorSchema = new mongoose.Schema({ name: String, role: String });
    const Distributor = mongoose.model('User', distributorSchema, 'users'); // Assuming 'users' collection

    const retailerSchema = new mongoose.Schema({ name: String, distributorId: mongoose.Schema.Types.ObjectId });
    const Retailer = mongoose.model('Retailer', retailerSchema);
    
    const orderSchema = new mongoose.Schema({ retailerId: mongoose.Schema.Types.ObjectId, totalAmount: Number, createdAt: Date });
    const Order = mongoose.model('Order', orderSchema);

    const transactionSchema = new mongoose.Schema({ 
        retailerId: mongoose.Schema.Types.ObjectId, 
        type: String, 
        amount: Number,
        createdAt: Date
    });
    const Transaction = mongoose.model('Transaction', transactionSchema);

    const distributors = await Distributor.find({ role: 'distributor' });
    console.log(`Found ${distributors.length} distributors`);
    distributors.forEach(d => console.log(`Distributor: ${d.name} (${d._id})`));

    if (distributors.length > 0) {
        const dId = distributors[0]._id;
        const retailers = await Retailer.find({ distributorId: dId });
        console.log(`Found ${retailers.length} retailers for first distributor`);
        retailers.forEach(r => console.log(`Retailer: ${r.name} (${r._id})`));

        if (retailers.length > 0) {
            const rId = retailers[0]._id;
            const orders = await Order.find({ retailerId: rId });
            console.log(`Found ${orders.length} orders for first retailer`);
            
            const txs = await Transaction.find({ retailerId: rId });
            console.log(`Found ${txs.length} transactions for first retailer`);
        }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
