const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');

// Try loading .env from current dir or parent (handles local scripts/ vs remote root)
require('dotenv').config(); 
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const userSchema = new mongoose.Schema({
  role: String,
  email: String
});
// Handle model recompilation error
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function run() {
  try {
    console.log('Connecting to DB...');
    // Force local DB connection as per user instruction
    const uri = 'mongodb://127.0.0.1:27017/amul_dist_app'; 
    console.log('Using URI:', uri); 
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    
    console.log('Finding distributor...');
    const dist = await User.findOne({ role: 'distributor' });
    
    if (!dist) {
      console.error('No distributor found!');
      process.exit(1);
    }
    
    console.log(`Found Distributor: ${dist.email} (${dist._id})`);

    // Diagnostics
    console.log('--- Diagnostics ---');
    
    // List Collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));
    
    // List Distributors
    const distributors = await User.find({ role: 'distributor' });
    console.log('Distributors found:', distributors.length);
    distributors.forEach(d => console.log(`- ${d.email} (${d._id})`));
    
    // Check All Orders
    const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
        distributorId: mongoose.Schema.Types.ObjectId,
        createdAt: Date
    }));
    const totalOrders = await Order.countDocuments();
    console.log(`Total Orders in DB: ${totalOrders}`);
    
    if (distributors.length > 0) {
        const dId = distributors[0]._id;
        const recentOrders = await Order.countDocuments({ distributorId: dId });
        console.log(`Orders for ${distributors[0].email}: ${recentOrders}`);
    }

    // Check StockMoves
    const StockMove = mongoose.models.StockMove || mongoose.model('StockMove', new mongoose.Schema({
        distributorId: mongoose.Schema.Types.ObjectId,
        type: String,
        createdAt: Date
    }));
    
    const totalMoves = await StockMove.countDocuments();
    console.log(`Total StockMoves in DB: ${totalMoves}`);
    
    console.log('-------------------');
    
    // Generate Token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('JWT_SECRET not found!');
        process.exit(1);
    }
    
    await mongoose.disconnect();
    
    // Call API for EACH distributor
    const port = process.env.PORT || 4000;
    const url = `http://127.0.0.1:${port}/api/debug/fix-ledger?force=true`;
    
    for (const dist of distributors) {
        console.log(`\nProcessing Distributor: ${dist.email} (${dist._id})`);
        
        const token = jwt.sign(
          { sub: dist._id, role: 'distributor' },
          secret,
          { expiresIn: '1h' }
        );
        
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const txt = await res.text();
                console.error(`  API Error ${res.status}: ${txt}`);
            } else {
                const data = await res.json();
                console.log('  Fix Result:', JSON.stringify(data));
            }
        } catch (e) {
            console.error('  Fetch failed:', e.message);
        }
    }
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
