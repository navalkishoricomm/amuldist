
const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/amul_dist_app';

async function checkIndexes() {
  try {
    await mongoose.connect(mongoUri);
    const collection = mongoose.connection.collection('transactions');
    const indexes = await collection.indexes();
    console.log('Indexes on transactions collection:');
    console.log(JSON.stringify(indexes, null, 2));
    
    // Check if there are duplicate payments for any retailer on the same day
    const aggregator = [
        {
            $group: {
                _id: {
                    retailer: "$retailerId",
                    type: "$type",
                    day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                },
                count: { $sum: 1 },
                ids: { $push: "$_id" }
            }
        },
        {
            $match: {
                count: { $gt: 1 },
                "_id.type": { $in: ["payment_cash", "payment_online"] }
            }
        }
    ];
    
    const duplicates = await collection.aggregate(aggregator).toArray();
    console.log(`Found ${duplicates.length} groups of multiple payments on same day.`);
    if(duplicates.length > 0) {
        console.log('Example:', JSON.stringify(duplicates[0], null, 2));
    } else {
        console.log('No multiple payments found on same day for any retailer (this might confirm the issue if they tried to enter them).');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkIndexes();
