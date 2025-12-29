
const baseUrl = 'http://localhost:4000';

async function test() {
    // 1. Login as admin
    console.log('Logging in as admin...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@local', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) { console.error('Admin login failed', loginData); process.exit(1); }
    const adminToken = loginData.token;

    // 2. Reset retailer password
    const retailerId = '68a889ca39ca8ae64e1fe846';
    console.log('Resetting retailer password...');
    const resetRes = await fetch(`${baseUrl}/api/admin/users/${retailerId}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ password: 'retailer123' })
    });
    if (!resetRes.ok) { console.error('Reset failed', await resetRes.json()); process.exit(1); }

    // 3. Login as retailer
    console.log('Logging in as retailer...');
    const retLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'retailer_1fe846@local.com', password: 'retailer123' })
    });
    const retLoginData = await retLoginRes.json();
    if (!retLoginRes.ok) { console.error('Retailer login failed', retLoginData); process.exit(1); }
    const retToken = retLoginData.token;

    // 4. Fetch transactions
    console.log('Fetching transactions...');
    const txRes = await fetch(`${baseUrl}/api/retailer/transactions`, {
        headers: { 'Authorization': `Bearer ${retToken}` }
    });
    const txData = await txRes.json();
    if (!txRes.ok) { console.error('Fetch transactions failed', txData); process.exit(1); }
    
    console.log('Transactions fetched:', txData.length);
    if (txData.length > 0) {
        console.log('Sample tx:', txData[0]);
    } else {
        console.warn('No transactions found (unexpected)');
    }
}

test();
