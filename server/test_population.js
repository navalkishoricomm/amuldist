const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function test() {
    try {
        // We need to login first or mock the auth. 
        // Since it's easier to just use the DB directly to check if data exists,
        // let's check the DB first.
        
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amul_dist_app';
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');
        
        const Product = mongoose.model('Product', new mongoose.Schema({
            nameEnglish: String,
            baseName: String,
            variantName: String
        }, { strict: false }));

        const products = await Product.find({}).limit(5);
        console.log('--- Sample Products in DB ---');
        products.forEach(p => {
            console.log(`ID: ${p._id}, Name: ${p.nameEnglish}, Base: ${p.baseName}, Var: ${p.variantName}`);
        });

        // Now let's try to simulate the population logic used in the route
        const StockMove = mongoose.model('StockMove', new mongoose.Schema({
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
        }, { strict: false }));

        const moves = await StockMove.find({})
            .limit(5)
            .populate({
                path: 'productId',
                select: 'nameEnglish baseName variantName'
            });

        console.log('\n--- Sample Stock Moves with Population ---');
        moves.forEach(m => {
            const p = m.productId;
            if(p) {
                console.log(`Move ID: ${m._id}, Product: ${p.nameEnglish}, Base: ${p.baseName}, Var: ${p.variantName}`);
            } else {
                console.log(`Move ID: ${m._id}, Product: null`);
            }
        });

        await mongoose.disconnect();

    } catch (err) {
        console.error(err);
    }
}

test();
