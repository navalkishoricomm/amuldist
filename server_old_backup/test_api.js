
const jwt = require('jsonwebtoken');

const secret = 'change_this_in_dev'; // Matched with server .env
const distributorId = '67501a36720f785b88231908'; // Correct ID from debug logs

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
    const retailerId = '675079a49934449887019349'; // Specific retailer with issues
    console.log(`Using Retailer ID: ${retailerId}`);

    // 2. Get Transactions for this retailer
    console.log(`\nFetching transactions for retailerId=${retailerId}...`);
    const resTx = await fetch(`http://127.0.0.1:4000/api/my/transactions?retailerId=${retailerId}`, { headers });
    if (!resTx.ok) throw new Error(`Transactions error: ${resTx.status}`);
    const transactions = await resTx.json();
    
    console.log(`Found ${transactions.length} transactions`);
    transactions.forEach(t => {
        console.log(`- ${t._id} | ${t.type} | ${t.amount} | ${t.createdAt} | Ref: ${t.referenceId}`);
    });
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
