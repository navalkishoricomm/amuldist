
const mongoose = require('mongoose');
const User = require('./server/index.js').User; // This won't work because User is not exported.

// I'll just connect and query directly.
mongoose.connect('mongodb://127.0.0.1:27017/amul_dist_app')
  .then(async () => {
    console.log('Connected');
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    const admins = await User.find({ role: 'admin' });
    console.log('Admins:', admins);
    
    const distributors = await User.find({ role: 'distributor' });
    console.log('Distributors:', distributors.length);
    
    const retailers = await User.find({ role: 'retailer' });
    console.log('Retailers:', retailers.length);

    mongoose.disconnect();
  })
  .catch(err => console.error(err));
