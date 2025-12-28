
const http = require('http');

const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@local';
const ADMIN_PASSWORD = 'admin123';

function request(method, path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  try {
    // 1. Login
    const loginRes = await request('POST', '/api/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    const token = loginRes.data.token;
    if (!token) throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Get a retailer
    const usersRes = await request('GET', '/api/users?role=retailer', null, headers);
    if (!usersRes.data || usersRes.data.length === 0) {
      console.log('No retailers found to test with.');
      return;
    }
    const retailer = usersRes.data[0];
    console.log(`Testing with retailer: ${retailer.name} (${retailer._id})`);

    // 3. Create Payment 1
    console.log('Creating Payment 1...');
    await request('POST', '/api/my/transactions', {
      retailerId: retailer._id,
      amount: 100,
      type: 'payment_cash',
      note: 'Test Payment 1'
    }, headers);

    // 4. Create Payment 2
    console.log('Creating Payment 2...');
    await request('POST', '/api/my/transactions', {
      retailerId: retailer._id,
      amount: 200,
      type: 'payment_cash',
      note: 'Test Payment 2'
    }, headers);

    // 5. Verify transactions
    const txRes = await request('GET', `/api/my/transactions?retailerId=${retailer._id}`, null, headers);
    const payments = txRes.data.filter(t => t.note && t.note.includes('Test Payment'));
    
    console.log(`Found ${payments.length} test payments.`);
    payments.forEach(p => console.log(`- ${p.type} ${p.amount} ${p.createdAt}`));

    if (payments.length === 2) {
        console.log('SUCCESS: Both payments recorded.');
    } else {
        console.log('FAILURE: Only ' + payments.length + ' payment(s) recorded.');
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
