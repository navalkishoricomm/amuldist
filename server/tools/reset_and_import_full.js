const mongoose = require('mongoose');
const dns = require('dns');
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

const REMOTE_URI = process.env.MONGODB_URI || "mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/amul_dist_app';

async function run() {
  let srcConn, tgtConn;
  try {
    console.log('Connecting to databases...');
    srcConn = await mongoose.createConnection(REMOTE_URI).asPromise();
    tgtConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('Connected.');

    // --- Define Local Models (Simplified for Migration) ---
    const Schema = mongoose.Schema;
    const ObjectId = mongoose.Types.ObjectId;

    // Unit
    const UnitSchema = new Schema({}, { strict: false });
    const Unit = tgtConn.model('Unit', UnitSchema);

    // Product
    const ProductSchema = new Schema({}, { strict: false });
    const Product = tgtConn.model('Product', ProductSchema);

    // User
    const UserSchema = new Schema({}, { strict: false });
    const User = tgtConn.model('User', UserSchema);

    // Order
    const OrderSchema = new Schema({}, { strict: false });
    const Order = tgtConn.model('Order', OrderSchema);

    // Transaction
    const TransactionSchema = new Schema({}, { strict: false });
    const Transaction = tgtConn.model('Transaction', TransactionSchema);

    // Others to clear
    const Inventory = tgtConn.model('Inventory', new Schema({}, { strict: false }));
    const RetailerRate = tgtConn.model('RetailerRate', new Schema({}, { strict: false }));
    const DistProduct = tgtConn.model('DistProduct', new Schema({}, { strict: false }));
    const Supplier = tgtConn.model('Supplier', new Schema({}, { strict: false }));
    const SupplierTransaction = tgtConn.model('SupplierTransaction', new Schema({}, { strict: false }));
    const StockMove = tgtConn.model('StockMove', new Schema({}, { strict: false }));

    // --- Identify Distributor ---
    const distributor = await User.findOne({ role: 'distributor' });
    if (!distributor) {
      console.error('CRITICAL: No Distributor found in local DB! Cannot proceed safely.');
      process.exit(1);
    }
    const DIST_ID = distributor._id;
    console.log(`Using Distributor ID: ${DIST_ID} (${distributor.name})`);

    // --- WIPE LOCAL DATA ---
    console.log('Wiping local data (preserving Admin/Distributor)...');
    
    // Clear Retailers
    await User.deleteMany({ role: 'retailer' });
    console.log('Cleared Retailers.');

    // Clear Products/Units
    await Unit.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await RetailerRate.deleteMany({});
    await DistProduct.deleteMany({});
    console.log('Cleared Products & Units.');

    // Clear Transactions/Orders
    await Order.deleteMany({});
    await Transaction.deleteMany({});
    await StockMove.deleteMany({});
    console.log('Cleared Orders, Transactions & Stock Moves.');

    // Clear Suppliers (Optional, but user said "all")
    await Supplier.deleteMany({});
    await SupplierTransaction.deleteMany({});
    console.log('Cleared Suppliers.');

    // --- IMPORT UNITS ---
    console.log('Importing Units...');
    const srcUnits = await srcConn.db.collection('itemunits').find({}).toArray();
    const unitMap = new Map(); // Old ID -> New ID (actually we keep IDs same)
    
    // Pass 1: Insert simple units
    for (const u of srcUnits) {
        // Fix string IDs
        const doc = {
            _id: new ObjectId(u._id),
            type: u.type,
            symbol: u.symbol,
            formalName: u.formalName,
            decimalPlaces: u.decimalPlaces || 0,
            conversionFactor: u.conversionFactor,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt
        };
        if(u.firstUnit) doc.firstUnit = new ObjectId(u.firstUnit);
        if(u.secondUnit) doc.secondUnit = new ObjectId(u.secondUnit);
        
        await Unit.create(doc);
    }
    console.log(`Imported ${srcUnits.length} Units.`);

    // --- IMPORT PRODUCTS ---
    console.log('Importing Products...');
    const srcItems = await srcConn.db.collection('items').find({}).toArray();
    for (const i of srcItems) {
        const doc = {
            _id: new ObjectId(i._id),
            nameEnglish: i.name,
            nameHindi: i.name, // Fallback
            active: true,
            unit: i.unit ? new ObjectId(i.unit) : null,
            createdAt: i.createdAt,
            updatedAt: i.updatedAt
        };
        await Product.create(doc);
    }
    console.log(`Imported ${srcItems.length} Products.`);

    // --- IMPORT RETAILERS (from partystockouts) ---
    console.log('Importing Retailers...');
    const srcParties = await srcConn.db.collection('partystockouts').find({}).toArray();
    let retailerCount = 0;
    for (const p of srcParties) {
        const doc = {
            _id: new ObjectId(p._id),
            name: p.name || 'Unknown Retailer',
            email: `retailer_${String(p._id).slice(-6)}@local.com`, // Dummy email
            role: 'retailer',
            active: true,
            passwordHash: 'x', // Dummy password
            phone: p.phoneNumber,
            address: p.address,
            distributorId: DIST_ID,
            currentBalance: 0, // Will be recalculated or imported? Let's start clean.
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
        };
        await User.create(doc);
        retailerCount++;
    }
    console.log(`Imported ${retailerCount} Retailers.`);

    // --- BUILD PRODUCT CONVERSION MAP ---
    const productMap = new Map(); // ProductId -> { conv: Number, isCompound: Boolean }
    const allProducts = await Product.find({}).lean();
    const allUnits = await Unit.find({}).lean();
    const unitLookup = new Map();
    allUnits.forEach(u => unitLookup.set(String(u._id), u));
    
    for(const p of allProducts){
        if(p.unit){
            const u = unitLookup.get(String(p.unit));
            if(u){
                productMap.set(String(p._id), {
                    conv: u.conversionFactor || 1,
                    isCompound: u.type === 'Compound'
                });
            }
        }
    }

    // --- IMPORT VOUCHERS ---
    console.log('Importing Vouchers (Orders & Transactions)...');
    const srcVouchers = await srcConn.db.collection('vouchers').find({}).sort({ date: 1 }).toArray();
    
    let orderCount = 0;
    let txCount = 0;

    for (const v of srcVouchers) {
        const date = new Date(v.date || v.createdAt);
        const retailerId = new ObjectId(v.partyId);

        // 1. Create Order if items exist
        if (v.items && v.items.length > 0) {
            const orderItems = v.items.map(item => {
                const pid = String(item.itemId);
                const info = productMap.get(pid);
                let qty = Number(item.unit) || 0;
                
                if(info && info.isCompound){
                    const alt = Number(item.alternateUnit) || 0;
                    qty = (qty * info.conv) + alt;
                }
                
                return {
                    productId: new ObjectId(item.itemId),
                    quantity: qty,
                    price: item.amount // Total amount initially
                };
            }).map(i => {
                if (i.quantity > 0) {
                    i.price = i.price / i.quantity;
                }
                return i;
            });

            // Create Order
            // We need an ID for the order. We can use voucher ID? 
            // Or generate new. Let's generate new to avoid conflict if we use voucher ID for Transaction.
            const orderId = new mongoose.Types.ObjectId();
            
            await Order.create({
                _id: orderId,
                retailerId: retailerId,
                distributorId: DIST_ID,
                items: orderItems,
                totalAmount: v.totalAmount,
                status: 'delivered', // Assuming old orders are delivered
                createdAt: date,
                updatedAt: date
            });
            orderCount++;

            // Create Stock Moves for Order Items
            for(const item of orderItems) {
                await StockMove.create({
                    distributorId: DIST_ID,
                    productId: item.productId,
                    retailerId: retailerId,
                    type: 'OUT',
                    quantity: item.quantity,
                    createdAt: date,
                    updatedAt: date
                });
            }

            // Create Transaction for Order (Debit)
            await Transaction.create({
                distributorId: DIST_ID,
                retailerId: retailerId,
                type: 'order',
                amount: v.totalAmount, // This increases debt
                referenceId: orderId,
                createdAt: date,
                updatedAt: date
            });
            txCount++;
        }

        // 2. Payments (from History Arrays ONLY)
        // We skip v.cashReceived and v.onlineReceived as they are redundant/latest copies 
        // and are already present in previousCashReceived/previousOnlineReceived.

        // Payments (Cash)
        if (v.previousCashReceived && Array.isArray(v.previousCashReceived)) {
            for (const p of v.previousCashReceived) {
                if (p.amount > 0) {
                    let pDate = p.createdAt ? new Date(p.createdAt) : date;
                    // Try to extract from ObjectId if createdAt is missing
                    if (!p.createdAt && p._id) {
                         try { pDate = p._id.getTimestamp(); } catch(e){}
                    }

                    await Transaction.create({
                        distributorId: DIST_ID,
                        retailerId: retailerId,
                        type: 'payment_cash',
                        amount: p.amount,
                        createdAt: pDate,
                        updatedAt: pDate
                    });
                    txCount++;
                }
            }
        }

        // Payments (Online)
        if (v.previousOnlineReceived && Array.isArray(v.previousOnlineReceived)) {
            for (const p of v.previousOnlineReceived) {
                const amt = Math.abs(p.amount);
                if (amt > 0) {
                    let pDate = p.createdAt ? new Date(p.createdAt) : date;
                    // Try to extract from ObjectId if createdAt is missing
                    if (!p.createdAt && p._id) {
                         try { pDate = p._id.getTimestamp(); } catch(e){}
                    }

                    await Transaction.create({
                        distributorId: DIST_ID,
                        retailerId: retailerId,
                        type: 'payment_online',
                        amount: amt,
                        createdAt: pDate,
                        updatedAt: pDate
                    });
                    txCount++;
                }
            }
        }
    }
    console.log(`Imported ${orderCount} Orders and ${txCount} Transactions.`);

    // --- RECALCULATE BALANCES ---
    console.log('Recalculating Retailer Balances...');
    const retailers = await User.find({ role: 'retailer' });
    for (const r of retailers) {
        const txs = await Transaction.find({ retailerId: r._id });
        let balance = 0;
        for (const tx of txs) {
            if (tx.type === 'order') balance += tx.amount;
            else if (tx.type === 'payment_cash') balance -= tx.amount;
            else if (tx.type === 'payment_online') balance -= tx.amount;
        }
        await User.updateOne({ _id: r._id }, { $set: { currentBalance: balance } });
    }
    console.log('Balances updated.');

  } catch (err) {
    console.error(err);
  } finally {
    if (srcConn) await srcConn.close();
    if (tgtConn) await tgtConn.close();
    process.exit(0);
  }
}

run();
