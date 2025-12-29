
const baseUrl = 'http://localhost:4000';

async function test() {
    // 1. Login as admin
    console.log('Logging in as admin...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@local', password: 'admin' }) // Guessing password 'admin' or 'admin123'
    });
    
    let loginData = await loginRes.json();
    if (!loginRes.ok) {
        console.log('Login failed with "admin". Trying "admin123"...');
        const loginRes2 = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@local', password: 'admin123' })
        });
        loginData = await loginRes2.json();
        if (!loginRes2.ok) {
            console.error('Login failed:', loginData);
            process.exit(1);
        }
    }
    
    const token = loginData.token;
    console.log('Logged in. Token:', token.substring(0, 20) + '...');

    // 2. Update Retailer Mapping
    const retailerId = '68a889ca39ca8ae64e1fe846';
    const newDistributorId = '6893635d853effc40396cfb3'; // rohitk29@gmail.com

    console.log(`Updating retailer ${retailerId} to distributor ${newDistributorId}...`);
    const updateRes = await fetch(`${baseUrl}/api/admin/users/${retailerId}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ distributorId: newDistributorId })
    });

    const updateData = await updateRes.json();
    if (!updateRes.ok) {
        console.error('Update failed:', updateData);
    } else {
        console.log('Update successful:', updateData);
        if (updateData.distributorId === newDistributorId) {
            console.log('Verification: distributorId matches.');
        } else {
            console.error('Verification: distributorId mismatch!', updateData.distributorId);
        }
    }
}

test();
