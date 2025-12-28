
const axios = require('axios');
const mongoose = require('mongoose');
const { expect } = require('chai');

const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'admin@local';
const ADMIN_PASSWORD = 'admin123';

async function run() {
  try {
    // 1. Login
    const loginRes = await axios.post(`${BASE_URL}/api/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Get a retailer
    const usersRes = await axios.get(`${BASE_URL}/api/users?role=retailer`, { headers });
    if (usersRes.data.length === 0) {
      console.log('No retailers found to test with.');
      return;
    }
    const retailer = usersRes.data[0];
    console.log(`Testing with retailer: ${retailer.name} (${retailer._id})`);

    // 3. Create Payment 1
    console.log('Creating Payment 1...');
    await axios.post(`${BASE_URL}/api/my/transactions`, {
      retailerId: retailer._id,
      amount: 100,
      type: 'payment_cash',
      note: 'Test Payment 1'
    }, { headers });

    // 4. Create Payment 2
    console.log('Creating Payment 2...');
    await axios.post(`${BASE_URL}/api/my/transactions`, {
      retailerId: retailer._id,
      amount: 200,
      type: 'payment_cash',
      note: 'Test Payment 2'
    }, { headers });

    // 5. Verify transactions
    const txRes = await axios.get(`${BASE_URL}/api/my/transactions?retailerId=${retailer._id}`, { headers });
    const payments = txRes.data.filter(t => t.note && t.note.includes('Test Payment'));
    
    console.log(`Found ${payments.length} test payments.`);
    payments.forEach(p => console.log(`- ${p.type} ${p.amount} ${p.createdAt}`));

    if (payments.length === 2) {
        console.log('SUCCESS: Both payments recorded.');
    } else {
        console.log('FAILURE: Only ' + payments.length + ' payment(s) recorded.');
    }

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

run();
