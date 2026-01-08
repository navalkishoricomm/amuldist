
const mongoose = require('mongoose');

const REMOTE_URI = 'mongodb://localhost:27017/amul_dist_app';

async function run() {
  try {
    await mongoose.connect(REMOTE_URI);
    console.log('Connected to DB');

    // Define schemas more accurately to avoid StrictPopulateError
    const unitSchema = new mongoose.Schema({
        type: String,
        symbol: String,
        conversionFactor: Number,
        firstUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
        secondUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }
    });
    const Unit = mongoose.models.Unit || mongoose.model('Unit', unitSchema);

    const productSchema = new mongoose.Schema({
        nameEnglish: String,
        nameHindi: String,
        unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' }
    });
    const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

    const orderSchema = new mongoose.Schema({
        items: [{
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
        }]
    }, { strict: false });
    const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

    // Find an order with items
    const order = await Order.findOne({'items.0': {$exists: true}})
      .populate({
        path: 'items.productId',
        select: 'nameEnglish nameHindi unit',
        populate: {
          path: 'unit',
          populate: { path: 'firstUnit secondUnit' }
        }
      });

    if (!order) {
        console.log('No orders found');
    } else {
        console.log('Order ID:', order._id);
        if (order.items && order.items.length > 0) {
            console.log('Items Count:', order.items.length);
            for(let i=0; i<order.items.length; i++) {
                const item = order.items[i];
                const p = item.productId;
                if(p) {
                   console.log(`Item ${i+1}: ${p.nameEnglish}`);
                   if(p.unit) {
                       console.log(`  Unit Type: ${p.unit.type}`);
                       console.log(`  Conversion: ${p.unit.conversionFactor}`);
                       if(p.unit.firstUnit) console.log(`  First Unit: ${p.unit.firstUnit.symbol}`);
                       if(p.unit.secondUnit) console.log(`  Second Unit: ${p.unit.secondUnit.symbol}`);
                   } else {
                       console.log('  No Unit linked');
                   }
                } else {
                    console.log(`Item ${i+1}: Product not found`);
                }
            }
        }
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
