const mongoose = require('mongoose');

// Configuration
const SOURCE_URI = 'mongodb+srv://ujjawaltyagi9627980:T95m7OVzQY13u7J2@cluster0.vccmheh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const TARGET_URI = 'mongodb://localhost:27017/amul_dist_app';

// Target Schemas (Simplified copies from index.js)
const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: String, email: String, role: String, active: Boolean,
  passwordHash: String, phone: String, address: String,
  distributorId: mongoose.Schema.Types.ObjectId,
  currentBalance: { type: Number, default: 0 },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  nameEnglish: String, nameHindi: String, active: Boolean,
  unit: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const unitSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: String, symbol: String, formalName: String, decimalPlaces: Number,
  firstUnit: mongoose.Schema.Types.ObjectId, secondUnit: mongoose.Schema.Types.ObjectId,
  conversionFactor: Number,
}, { timestamps: true });

const retailerRateSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  productId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  price: Number,
}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  productId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
}, { timestamps: true });

const stockMoveSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  productId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  supplierId: mongoose.Schema.Types.ObjectId,
  type: String, quantity: Number, note: String,
  createdAt: Date
}, { timestamps: true });

const supplierSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  name: String, phone: String, active: Boolean,
  currentBalance: Number,
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    quantity: Number,
    price: Number
  }],
  totalAmount: Number,
  status: String,
  createdAt: Date
}, { timestamps: true });

const transactionSchema = new mongoose.Schema({
  distributorId: mongoose.Schema.Types.ObjectId,
  retailerId: mongoose.Schema.Types.ObjectId,
  type: String, amount: Number, note: String,
  referenceId: mongoose.Schema.Types.ObjectId,
  createdAt: Date
}, { timestamps: true });

// Models
let TargetUser, TargetProduct, TargetUnit, TargetRetailerRate, TargetInventory, TargetStockMove, TargetSupplier, TargetOrder, TargetTransaction;

async function migrate() {
  console.log('Starting Migration...');

  // 1. Connect to Source
  const srcConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  console.log('Connected to Source.');

  // 2. Connect to Target
  const tgtConn = await mongoose.createConnection(TARGET_URI).asPromise();
  console.log('Connected to Target.');

  // Initialize Models
  TargetUser = tgtConn.model('User', userSchema);
  TargetProduct = tgtConn.model('Product', productSchema);
  TargetUnit = tgtConn.model('Unit', unitSchema);
  TargetRetailerRate = tgtConn.model('RetailerRate', retailerRateSchema);
  TargetInventory = tgtConn.model('Inventory', inventorySchema);
  TargetStockMove = tgtConn.model('StockMove', stockMoveSchema);
  TargetSupplier = tgtConn.model('Supplier', supplierSchema);
  TargetOrder = tgtConn.model('Order', orderSchema);
  TargetTransaction = tgtConn.model('Transaction', transactionSchema);

  // Maps
  const productIdMap = {}; // SourceID -> TargetID
  const unitIdMap = {}; // SourceID -> TargetID
  const productMap = {}; // SourceID -> TargetDoc (fetched from DB)
  const unitMap = {}; // SourceID -> TargetDoc (fetched from DB)
  const partyIdMap = {}; // SourceID -> TargetID

  try {
    // --- Step 1: Identify/Create Distributor ---
    const SrcUser = srcConn.model('users', new mongoose.Schema({}, { strict: false }));
    const srcUsers = await SrcUser.find().lean();
    
    if (srcUsers.length === 0) throw new Error('No users found in source DB');
    
    const mainUser = srcUsers[0]; 
    const distributorId = mainUser._id;
    console.log(`Distributor: ${mainUser.name} (${distributorId})`);

    await TargetUser.findOneAndUpdate(
      { _id: mainUser._id },
      {
        _id: mainUser._id,
        name: mainUser.name,
        email: mainUser.email || 'admin@local',
        role: 'distributor',
        active: mainUser.isActive,
        passwordHash: mainUser.password,
        phone: mainUser.phoneNumber
      },
      { upsert: true }
    );

    // --- Step 2: Units ---
    console.log('Migrating Units...');
    const SrcUnit = srcConn.model('itemunits', new mongoose.Schema({}, { strict: false }));
    const srcUnits = await SrcUnit.find().lean();

    // First pass: Create all units with original IDs (if possible) or map them
    // Actually, units don't have unique names in schema, but we should try to match by symbol/type to avoid duplication
    for (const u of srcUnits) {
        // Try to find by symbol + type
        let existing = await TargetUnit.findOne({ symbol: u.symbol, type: u.type });
        if (existing) {
            console.log(`Unit mapped: ${u.symbol} (${u._id} -> ${existing._id})`);
            unitIdMap[u._id.toString()] = existing._id;
            unitMap[u._id.toString()] = existing;
        } else {
            // Try to use original ID
            existing = await TargetUnit.findById(u._id);
            if (existing) {
                // Update it
                await TargetUnit.updateOne({_id: u._id}, {
                    type: u.type,
                    symbol: u.symbol,
                    formalName: u.formalName,
                    decimalPlaces: u.decimalPlaces,
                    conversionFactor: u.conversionFactor
                });
                unitIdMap[u._id.toString()] = u._id;
                unitMap[u._id.toString()] = await TargetUnit.findById(u._id);
            } else {
                // Create new
                const newUnit = await TargetUnit.create({
                    _id: u._id,
                    type: u.type,
                    symbol: u.symbol,
                    formalName: u.formalName,
                    decimalPlaces: u.decimalPlaces,
                    conversionFactor: u.conversionFactor
                });
                unitIdMap[u._id.toString()] = newUnit._id;
                unitMap[u._id.toString()] = newUnit;
            }
        }
    }
    
    // Second pass: Link compound units (firstUnit, secondUnit)
    for (const u of srcUnits) {
        const targetId = unitIdMap[u._id.toString()];
        if (!targetId) continue;
        
        if (u.type === 'Compound') {
            const f = unitIdMap[u.firstUnit ? u.firstUnit.toString() : null];
            const s = unitIdMap[u.secondUnit ? u.secondUnit.toString() : null];
            if (f || s) {
                await TargetUnit.updateOne({ _id: targetId }, { firstUnit: f, secondUnit: s });
                // Update local map cache too
                unitMap[u._id.toString()].firstUnit = f;
                unitMap[u._id.toString()].secondUnit = s;
            }
        }
    }

    // --- Step 3: Products ---
    console.log('Migrating Products...');
    const SrcItem = srcConn.model('items', new mongoose.Schema({}, { strict: false }));
    const srcItems = await SrcItem.find().lean();

    for (const item of srcItems) {
      let existing = await TargetProduct.findOne({ nameEnglish: item.name });
      const targetUnitId = unitIdMap[item.unit ? item.unit.toString() : null];

      if (existing) {
        console.log(`Product mapped by name: ${item.name} (${item._id} -> ${existing._id})`);
        productIdMap[item._id.toString()] = existing._id;
        productMap[item._id.toString()] = existing;
        
        // Update unit if missing?
        if (!existing.unit && targetUnitId) {
            existing.unit = targetUnitId;
            await existing.save();
        }
      } else {
        existing = await TargetProduct.findById(item._id);
        if (existing) {
             console.log(`Product mapped by ID: ${item.name} (${item._id})`);
             existing.nameEnglish = item.name;
             existing.nameHindi = item.name;
             existing.unit = targetUnitId;
             await existing.save();
             productIdMap[item._id.toString()] = existing._id;
             productMap[item._id.toString()] = existing;
        } else {
            try {
                const newProd = await TargetProduct.create({
                    _id: item._id,
                    nameEnglish: item.name,
                    nameHindi: item.name,
                    active: true,
                    unit: targetUnitId
                });
                productIdMap[item._id.toString()] = newProd._id;
                productMap[item._id.toString()] = newProd;
            } catch (e) {
                console.error(`Error creating product ${item.name}:`, e.message);
            }
        }
      }
    }

    // --- Step 4: Parties ---
    console.log('Migrating Parties...');
    const SrcRetailer = srcConn.model('partystockouts', new mongoose.Schema({}, { strict: false }));
    const SrcSupplier = srcConn.model('partystockins', new mongoose.Schema({}, { strict: false }));
    const srcRetailers = await SrcRetailer.find().lean();
    const srcSuppliers = await SrcSupplier.find().lean();

    // Retailers
    for (const p of srcRetailers) {
      let existing = await TargetUser.findOne({ name: p.name });
      if (existing) {
        console.log(`Retailer mapped by name: ${p.name} (${p._id} -> ${existing._id})`);
        existing.role = 'retailer';
        existing.distributorId = distributorId;
        await existing.save();
        partyIdMap[p._id.toString()] = existing._id;
      } else {
        existing = await TargetUser.findById(p._id);
        if (existing) {
          console.log(`Retailer mapped by ID: ${p.name} (${p._id})`);
          existing.name = p.name;
          existing.role = 'retailer';
          existing.distributorId = distributorId;
          await existing.save();
          partyIdMap[p._id.toString()] = existing._id;
        } else {
          try {
            const email = `retailer_${p._id}@migrated.com`;
            const newRetailer = await TargetUser.create({
              _id: p._id,
              name: p.name,
              role: 'retailer',
              email: email,
              passwordHash: '$2b$10$xyz',
              phone: p.phoneNumber || '',
              address: p.address || '',
              active: true,
              distributorId: distributorId,
              currentBalance: Number(p.currentBalance || 0)
            });
            partyIdMap[p._id.toString()] = newRetailer._id;
          } catch (e) {
            console.error(`Error creating retailer ${p.name}:`, e.message);
          }
        }
      }
    }

    // Suppliers
    for (const s of srcSuppliers) {
      await TargetSupplier.findOneAndUpdate(
        { _id: s._id },
        {
          _id: s._id,
          distributorId: distributorId,
          name: s.name,
          phone: s.phoneNumber || '',
          active: true,
        },
        { upsert: true }
      );
    }

    // --- Step 5: Rates ---
    console.log('Migrating Rates...');
    const SrcRate = srcConn.model('ratelists', new mongoose.Schema({}, { strict: false }));
    const srcRates = await SrcRate.find().lean();

    for (const r of srcRates) {
      const pid = productIdMap[r.item.toString()];
      if (!pid) continue;

      await TargetRetailerRate.findOneAndUpdate(
        { retailerId: r.party, productId: pid, distributorId: distributorId },
        {
          distributorId: distributorId,
          retailerId: r.party,
          productId: pid,
          price: r.rate
        },
        { upsert: true }
      );
    }

    // --- Step 6: Stock In ---
    console.log('Migrating Stock In...');
    const SrcStockIn = srcConn.model('stockinentries', new mongoose.Schema({}, { strict: false }));
    const srcStockIns = await SrcStockIn.find().lean();
    const inventoryState = {}; // productId -> qty

    for (const s of srcStockIns) {
        const pid = productIdMap[s.item.toString()];
        if (!pid) continue;
        
        const prod = productMap[s.item.toString()]; // Wait, this uses SourceID key for map. Correct.
        // Wait, productMap keys are SourceIDs. Correct.
        // But `prod` in map is the Target Doc.
        
        let qty = Number(s.unit) || 0;
        const targetUnitId = prod.unit ? prod.unit.toString() : null;
        // Find unit doc from targetUnitId
        // We need a map TargetID -> UnitDoc? Or loop?
        // Let's rely on `unitIdMap` reverse lookup? No.
        // Let's just fetch it or assume logic matches.
        // We have `unitMap` (SourceID -> UnitDoc).
        // But we need the UnitDoc associated with the PRODUCT.
        // The product has `unit` field which is a TargetID.
        // We need to find the UnitDoc with that TargetID.
        
        // Helper to find unit doc by TargetID
        const getUnitDoc = (tid) => Object.values(unitMap).find(u => u._id.toString() === tid);
        const u = targetUnitId ? getUnitDoc(targetUnitId) : null;

        if (u && u.type === 'Compound') {
            const conv = Number(u.conversionFactor) || 1;
            const mainQty = Number(s.unit) || 0;
            const subQty = Number(s.alternateUnit) || 0;
            qty = (mainQty * conv) + subQty;
        }

        if (qty > 0) {
            await TargetStockMove.create({
                distributorId: distributorId,
                productId: pid,
                supplierId: s.party,
                type: 'IN',
                quantity: qty,
                createdAt: s.date || s.createdAt
            });
            inventoryState[pid.toString()] = (inventoryState[pid.toString()] || 0) + qty;
        }
    }

    // --- Step 7: Vouchers ---
    console.log('Migrating Vouchers...');
    const SrcVoucher = srcConn.model('vouchers', new mongoose.Schema({}, { strict: false }));
    const srcVouchers = await SrcVoucher.find().sort({ date: 1 }).lean();
    console.log(`Found ${srcVouchers.length} vouchers.`);

    let vCount = 0;
    for (const v of srcVouchers) {
        vCount++;
        if (vCount % 100 === 0) console.log(`Processing voucher ${vCount}/${srcVouchers.length}`);
        
        if (!v.items || !Array.isArray(v.items)) continue;

        const orderItems = [];
        let orderTotal = 0;

        const targetRetailerId = partyIdMap[v.partyId.toString()];
        if (!targetRetailerId) {
            // console.warn(`Skipping voucher ${v._id}: Retailer ${v.partyId} not found`);
            continue;
        }

        try {
            for (const item of v.items) {
                if (!item.itemId) continue;
                const pid = productIdMap[item.itemId.toString()];
                if (!pid) continue;
                
                const prod = productMap[item.itemId.toString()];
                if (!prod) continue; // Should not happen if pid exists

                const targetUnitId = prod.unit ? prod.unit.toString() : null;
                const getUnitDoc = (tid) => Object.values(unitMap).find(u => u._id.toString() === tid);
                const u = targetUnitId ? getUnitDoc(targetUnitId) : null;
                
                let qty = 0;
                if (u && u.type === 'Compound') {
                    const conv = Number(u.conversionFactor) || 1;
                    const mainQty = Number(item.unit) || 0;
                    const subQty = Number(item.alternateUnit) || 0;
                    qty = (mainQty * conv) + subQty;
                } else {
                    qty = Number(item.unit) || 0;
                }

                if (qty > 0) {
                    const price = item.amount / qty;
                    orderItems.push({
                        productId: pid,
                        quantity: qty,
                        price: price
                    });
                    orderTotal += item.amount;
                    inventoryState[pid.toString()] = (inventoryState[pid.toString()] || 0) - qty;
                }
            }

            if (orderItems.length > 0) {
                 await TargetOrder.findOneAndUpdate(
                     { _id: v._id },
                     {
                         _id: v._id,
                         distributorId: distributorId,
                         retailerId: targetRetailerId,
                         items: orderItems,
                         totalAmount: v.totalAmount,
                         status: 'delivered',
                         createdAt: v.date || v.createdAt
                     },
                     { upsert: true }
                 );

                 for (const item of orderItems) {
                     await TargetStockMove.create({
                         distributorId: distributorId,
                         productId: item.productId,
                         retailerId: targetRetailerId,
                         type: 'OUT',
                         quantity: item.quantity,
                         note: 'Imported Order',
                         createdAt: v.date || v.createdAt
                     });
                 }

                 // Create Transaction (Order Debit)
                  if (v.totalAmount > 0) {
                      await TargetTransaction.create({
                          distributorId: distributorId,
                          retailerId: targetRetailerId,
                          type: 'order',
                          amount: v.totalAmount,
                          referenceId: v._id,
                          note: 'Imported Order',
                          createdAt: v.date || v.createdAt
                      });
                  }

                 // Payments
                 if (v.cashReceived > 0) {
                     await TargetTransaction.create({
                         distributorId: distributorId,
                         retailerId: targetRetailerId,
                         type: 'payment_cash',
                         amount: v.cashReceived,
                         referenceId: v._id,
                         note: 'Imported Voucher Cash',
                         createdAt: v.date || v.createdAt
                     });
                 }
                 if (v.onlineReceived > 0) {
                      await TargetTransaction.create({
                          distributorId: distributorId,
                          retailerId: targetRetailerId,
                          type: 'payment_online',
                          amount: v.onlineReceived,
                          referenceId: v._id,
                          note: 'Imported Voucher Online',
                          createdAt: v.date || v.createdAt
                      });
                 }
             }
        } catch (err) {
            console.error(`Error processing voucher ${v._id}:`, err.message);
        }
    }

    // --- Step 8: Save Inventory ---
    console.log('Saving Inventory...');
    for (const [pid, qty] of Object.entries(inventoryState)) {
        await TargetInventory.findOneAndUpdate(
            { distributorId: distributorId, productId: pid },
            { quantity: qty },
            { upsert: true }
        );
    }
    
    // --- Step 9: Update Retailer Balances ---
    console.log('Updating Balances...');
    const retailers = await TargetUser.find({ role: 'retailer', distributorId: distributorId });
    for (const r of retailers) {
        const txs = await TargetTransaction.find({ retailerId: r._id });
        let bal = 0;
        for (const t of txs) {
             if (t.type === 'order') bal += t.amount;
             else if (t.type.startsWith('payment')) bal -= t.amount;
        }
        r.currentBalance = bal;
        await r.save();
    }

  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    await srcConn.close();
    await tgtConn.close();
    console.log('Migration Complete.');
  }
}

migrate();
