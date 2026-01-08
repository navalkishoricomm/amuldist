const http = require('http');

function postRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: '127.0.0.1',
      port: 4000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
           resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
           resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.write(data);
    req.end();
  });
}

function getRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 4000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
         try {
           resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
           resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.end();
  });
}

async function testLogin() {
  try {
    console.log('Attempting login...');
    const loginRes = await postRequest('/api/auth/login', {
      email: 'admin@local',
      password: 'admin123'
    });
    
    console.log('Login Status:', loginRes.status);
    console.log('Login Response:', loginRes.data);
    
    if (loginRes.status !== 200 || !loginRes.data.token) {
        console.error('Login failed');
        return;
    }

    const token = loginRes.data.token;
    console.log('Token received. Attempting /api/me...');
    
    const meRes = await getRequest('/api/me', token);
    console.log('/api/me Status:', meRes.status);
    console.log('/api/me Response:', meRes.data);

  } catch (err) {
    console.error('Error:', err);
  }
}

testLogin();
