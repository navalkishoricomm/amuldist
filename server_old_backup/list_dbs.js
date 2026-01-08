const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017';

async function run() {
    try {
        console.log(`Connecting to: ${uri}`);
        const conn = await mongoose.createConnection(uri).asPromise();
        console.log('Connected.');
        
        const admin = conn.db.admin();
        const dbs = await admin.listDatabases();
        
        console.log("Databases:");
        for (const db of dbs.databases) {
            console.log(` - ${db.name} (Size: ${db.sizeOnDisk})`);
        }
        
        // Check collections in each DB to find 'users' and look for 'Anant'
        for (const dbInfo of dbs.databases) {
            if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;
            
            console.log(`\nChecking DB: ${dbInfo.name}`);
            const dbConn = conn.useDb(dbInfo.name);
            const collections = await dbConn.db.listCollections().toArray();
            const colNames = collections.map(c => c.name);
            console.log(` Collections: ${colNames.join(', ')}`);
            
            if (colNames.includes('users')) {
                const User = dbConn.model('User', new mongoose.Schema({ name: String, role: String }, { strict: false }));
                const users = await User.find({ name: /Anant/i });
                if (users.length > 0) {
                    console.log(` !!! FOUND 'Anant' in DB: ${dbInfo.name} !!!`);
                    users.forEach(u => console.log(`   User: ${u.name} (${u._id}) - ${u.role}`));
                } else {
                    console.log(` 'Anant' not found in ${dbInfo.name}.`);
                    // Check for 'Rohit' just in case
                    const rohit = await User.findOne({ name: /Rohit/i });
                    if (rohit) console.log(`   Found 'Rohit': ${rohit.name}`);
                }
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

run();
