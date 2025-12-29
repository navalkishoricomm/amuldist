const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

async function testLogin() {
  try {
    console.log('Attempting login...');
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@local',
      password: 'admin123'
    });
    
    console.log('Login successful!');
    console.log('Token:', res.data.token ? 'Received' : 'Missing');
    
    const token = res.data.token;
    
    if (!token) {
        console.error('No token received');
        return;
    }

    console.log('Attempting /api/me...');
    const meRes = await axios.get(`${BASE_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('/api/me response:', meRes.data);

  } catch (err) {
    console.error('Error occurred:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testLogin();
