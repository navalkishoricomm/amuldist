
// const fetch = require('node-fetch'); // If not available, we'll use native fetch if node 18+

const BASE_URL = 'http://localhost:4000';
const JWT_SECRET = 'amul_dist_secret_key_2024';

async function run() {
  try {
    // 1. Create Distributor
    const email = `dist_test_${Date.now()}@test.com`;
    const password = 'password123';
    
    console.log('Creating distributor...');
    const createRes = await fetch(`${BASE_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-secret': JWT_SECRET },
        body: JSON.stringify({ name: 'Test Dist', email, password, role: 'distributor' })
    });
    
    if (!createRes.ok) {
        console.log('Create failed:', await createRes.text());
        return;
    }
    const user = await createRes.json();
    const token = user.token;
    console.log('Distributor created/logged in:', user.user.email);

    // 2. Get Products
    console.log('Fetching products...');
    const prodRes = await fetch(`${BASE_URL}/api/my/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const products = await prodRes.json();
    console.log(`Found ${products.length} products`);

    // 3. Find a Global Product and a Custom Product
    // We might need to create a custom product first if none exist.
    let globalProd = products.find(p => p.source === 'global');
    
    // Create custom product
    console.log('Creating custom product...');
    const createCustomRes = await fetch(`${BASE_URL}/api/my/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEnglish: 'Custom Milk', nameHindi: 'Milk', price: 50, unit: products[0]?.unit || null }) // use any unit
    });
    const customProd = await createCustomRes.json();
    console.log('Custom product created:', customProd._id);

    // 4. Update Global Product Price
    if (globalProd) {
        console.log(`Updating Global Product ${globalProd.nameEnglish} price to 999...`);
        const patchGlobal = await fetch(`${BASE_URL}/api/my/products/${globalProd._id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: 999 })
        });
        const globalUpdated = await patchGlobal.json();
        console.log('Global Update Result:', globalUpdated);
    }

    // 5. Update Custom Product Price
    console.log(`Updating Custom Product ${customProd.nameEnglish} price to 888...`);
    const patchCustom = await fetch(`${BASE_URL}/api/my/products/${customProd._id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 888 })
    });
    const customUpdated = await patchCustom.json();
    console.log('Custom Update Result:', customUpdated);

    // 6. Verify with GET
    console.log('Verifying prices...');
    const verifyRes = await fetch(`${BASE_URL}/api/my/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyProducts = await verifyRes.json();
    
    if (globalProd) {
        const gp = verifyProducts.find(p => p._id === globalProd._id);
        console.log(`Global Product Price: ${gp.price} (Expected: 999)`);
    }
    const cp = verifyProducts.find(p => p._id === customProd._id);
    console.log(`Custom Product Price: ${cp.price} (Expected: 888)`);

  } catch (err) {
    console.error(err);
  }
}

// Check if node-fetch is needed or native fetch exists
if (typeof fetch === 'undefined') {
    // In older node, we might fail. But environment is likely Node 18+
    console.log('Using native fetch');
}

run();
