
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/amul_dist_app')
  .then(async () => {
    console.log('Connected');
    const userSchema = new mongoose.Schema({
        name: String, email: String, role: String, active: Boolean, distributorId: mongoose.Schema.Types.ObjectId
    }, { strict: false });
    const User = mongoose.model('User', userSchema);

    const admins = await User.find({ role: 'admin' });
    console.log('Admins:', admins.map(u => ({_id: u._id, email: u.email})));
    
    const distributors = await User.find({ role: 'distributor' });
    console.log('Distributors:', distributors.map(u => ({_id: u._id, email: u.email})));
    
    const retailers = await User.find({ role: 'retailer' }).limit(5);
    console.log('Retailers (first 5):', retailers.map(u => ({_id: u._id, email: u.email, distributorId: u.distributorId})));

    if (admins.length > 0 && distributors.length > 0 && retailers.length > 0) {
        console.log('Data available for test.');
    } else {
        console.log('Data missing.');
    }

    mongoose.disconnect();
  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
