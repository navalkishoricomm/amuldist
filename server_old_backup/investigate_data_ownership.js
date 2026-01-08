const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = 'mongodb://127.0.0.1:27017/amul_dist_app';

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

const stockMoveSchema = new mongoose.Schema({}, { strict: false });
const StockMove = mongoose.model('StockMove', stockMoveSchema);

async function investigate() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');

    const totalStock = await StockMove.countDocuments({});
    console.log(`Total StockMoves: ${totalStock}`);

    // Get unique distributorIds from StockMoves
    const distinctDistIds = await StockMove.distinct('distributorId');
    console.log(`Found ${distinctDistIds.length} unique distributor IDs in StockMoves.`);

    for (const distId of distinctDistIds) {
        const count = await StockMove.countDocuments({ distributorId: distId });
        const user = await User.findById(distId);
        
        if (user) {
            console.log(`- ID: ${distId} | Count: ${count} | User: ${user.name} (${user.email}) [${user.role}]`);
        } else {
            console.log(`- ID: ${distId} | Count: ${count} | User: NOT FOUND (Orphaned Data)`);
        }
    }

    // Also check current distributor ID
    const currentDist = await User.findOne({ email: 'rohitk29@gmail.com' });
    console.log(`\nCurrent User: ${currentDist.name} (${currentDist.email}) ID: ${currentDist._id}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

investigate();
