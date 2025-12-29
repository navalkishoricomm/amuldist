
// Migration script to convert String dates to Date objects
// Run with: mongosh amul_dist_app migrate_dates.js

function migrateCollection(collectionName) {
    print(`Migrating ${collectionName}...`);
    var bulk = db[collectionName].initializeUnorderedBulkOp();
    var count = 0;
    
    db[collectionName].find({ createdAt: { $type: "string" } }).forEach(function(doc) {
        var updates = {};
        var needsUpdate = false;

        if (doc.createdAt && typeof doc.createdAt === 'string') {
            updates.createdAt = new Date(doc.createdAt);
            needsUpdate = true;
        }
        if (doc.updatedAt && typeof doc.updatedAt === 'string') {
            updates.updatedAt = new Date(doc.updatedAt);
            needsUpdate = true;
        }

        if (needsUpdate) {
            bulk.find({ _id: doc._id }).updateOne({ $set: updates });
            count++;
            if (count % 1000 === 0) {
                bulk.execute();
                bulk = db[collectionName].initializeUnorderedBulkOp();
                print(`Processed ${count} documents in ${collectionName}`);
            }
        }
    });

    if (count % 1000 !== 0) {
        bulk.execute();
    }
    print(`Finished ${collectionName}. Total updated: ${count}`);
}

migrateCollection('stockmoves');
migrateCollection('transactions');
migrateCollection('suppliertransactions');
