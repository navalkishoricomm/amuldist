
const jwt = require('jsonwebtoken');

const secret = 'amul_dist_secret_key_2024'; // Hardcoded from server_env
const distributorId = '6893635d853effc40396cfb3'; // From logs

const token = jwt.sign(
  { sub: distributorId, role: 'distributor' },
  secret,
  { expiresIn: '1h' }
);

async function test() {
  console.log('Testing API with token:', token.substring(0, 20) + '...');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Get Retailers to find a valid ID
    console.log('\nFetching retailers...');
    const resRetailers = await fetch('http://127.0.0.1:4000/api/my/retailers', { headers });
    if (!resRetailers.ok) throw new Error(`Retailers error: ${resRetailers.status}`);
    const retailers = await resRetailers.json();
    console.log(`Found ${retailers.length} retailers`);
    
    if (retailers.length === 0) {
      console.log('No retailers found, cannot test transaction filter.');
      return;
    }

    const retailer = retailers[0];
    console.log(`Using Retailer: ${retailer.name} (${retailer._id})`);

    // 2. Get Transactions for this retailer
    console.log(`\nFetching transactions for retailerId=${retailer._id}...`);
    const resTx = await fetch(`http://127.0.0.1:4000/api/my/transactions?retailerId=${retailer._id}`, { headers });
    if (!resTx.ok) throw new Error(`Transactions error: ${resTx.status}`);
    const transactions = await resTx.json();
    
    console.log(`Found ${transactions.length} transactions`);
    if (transactions.length > 0) {
      console.log('First 3 transactions:');
      transactions.slice(0, 3).forEach(t => {
        console.log(`- ${t.date || t.createdAt}: ${t.type} ${t.amount} (Retailer: ${t.retailerId?.name || t.retailerId})`);
      });
    } else {
      console.log('No transactions found for this retailer.');
    }

  } catch (err) {
    console.error('Error:', err.message);
    if (err.cause) console.error(err.cause);
  }
}

test();
