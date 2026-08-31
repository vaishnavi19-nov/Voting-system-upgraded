const http = require('http');

const loginData = JSON.stringify({
  identifier: 'ADMIN-001',
  password: 'admin123'
});

const reqLogin = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/admin-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const { token } = JSON.parse(body);
    if (!token) {
      console.log('Login failed:', body);
      return;
    }
    
    // Now create candidate
    const data = JSON.stringify({
      position: 'PRESIDENT',
      name: 'Test Candidate',
      number: 99,
      photoUrl: 'data:image/png;base64,' + 'a'.repeat(2 * 1024 * 1024), // 2MB base64 string
      description: 'Test description',
      partyAffiliation: 'Test Party'
    });
    
    const reqCand = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/candidates',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}` 
      }
    }, (resCand) => {
      let bodyCand = '';
      resCand.on('data', chunk => bodyCand += chunk);
      resCand.on('end', () => {
        console.log('Candidate Response Status:', resCand.statusCode);
        console.log('Candidate Response Body:', bodyCand);
      });
    });
    reqCand.on('error', e => console.error(e));
    reqCand.write(data);
    reqCand.end();
  });
});

reqLogin.on('error', e => console.error(e));
reqLogin.write(loginData);
reqLogin.end();
