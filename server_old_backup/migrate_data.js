const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

// Schemas (copied from index.js for standalone script)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  active: { type: Boolean, default: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number },
    price: { type: Number }
  }],
  createdAt: { type: Date }
});
const Order = mongoose.model('Order', orderSchema);

const rateSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    price: { type: Number, required: true },
}, { timestamps: true });
const Rate = mongoose.model('Rate', rateSchema);

async function runMigration() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Find distributor rohitk29
    // Try to find by email or name matching rohitk29
    const distributor = await User.findOne({ 
        role: 'distributor', 
        $or: [
            { email: /rohitk29/i }, 
            { name: /rohitk29/i }
        ] 
    });

    if (!distributor) {
        console.error('Distributor rohitk29 not found. Aborting retailer mapping.');
        // We can still try to extract rates if orders have distributorIds
    } else {
        console.log(`Found distributor: ${distributor.name} (${distributor.email})`);

        // 2. Map retailers to rohitk29
        const result = await User.updateMany(
            { role: 'retailer', distributorId: { $exists: false } },
            { $set: { distributorId: distributor._id } }
        );
        console.log(`Updated ${result.modifiedCount} retailers to map to ${distributor.name}`);
        
        // Also update retailers who have null distributorId
        const resultNull = await User.updateMany(
            { role: 'retailer', distributorId: null },
            { $set: { distributorId: distributor._id } }
        );
        console.log(`Updated ${resultNull.modifiedCount} retailers (from null) to map to ${distributor.name}`);
    }

    // 3. Extract rates from orders
    console.log('Extracting rates from orders...');
    const orders = await Order.find({}).sort({ createdAt: 1 }); // Oldest to newest
    console.log(`Found ${orders.length} orders`);

    let ratesUpdated = 0;

    for (const order of orders) {
        let distId = order.distributorId;
        
        // If order doesn't have distributorId, try to get it from retailer
        if (!distId && order.retailerId) {
            const retailer = await User.findById(order.retailerId);
            if (retailer && retailer.distributorId) {
                distId = retailer.distributorId;
            }
        }

        if (!distId) {
            // If we found the target distributor earlier, maybe use that as fallback?
            // Safer to skip if we can't link to a distributor, as rates are distributor-specific.
            if (distributor) {
                 distId = distributor._id;
            } else {
                continue;
            }
        }

        if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
                if (item.productId && item.price) {
                    await Rate.findOneAndUpdate(
                        { productId: item.productId, distributorId: distId },
                        { price: item.price },
                        { upsert: true, new: true }
                    );
                    ratesUpdated++;
                }
            }
        }
    }

    console.log(`Processed rates. Total rate update operations: ${ratesUpdated}`);
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runMigration();
