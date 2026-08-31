const http = require('http');

const loginData = JSON.stringify({
  identifier: 'ADMIN-001',
  password: 'admin123'
});

console.time('Total');
console.time('Login');

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
    console.timeEnd('Login');
    const { token } = JSON.parse(body);
    if (!token) return console.log('Login failed');
    
    // Create candidate with very small image
    const dataSmall = JSON.stringify({
      position: 'PRESIDENT',
      name: 'Small Cand',
      number: 100,
      photoUrl: 'data:image/png;base64,abc',
      description: 'Test',
      partyAffiliation: 'Test'
    });
    
    console.time('AddSmall');
    const reqSmall = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/candidates',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataSmall),
        'Authorization': `Bearer ${token}` 
      }
    }, (resSmall) => {
      let bodySmall = '';
      resSmall.on('data', chunk => bodySmall += chunk);
      resSmall.on('end', () => {
        console.timeEnd('AddSmall');
        
        // Create candidate with 2MB image
        const dataLarge = JSON.stringify({
          position: 'VICE_PRESIDENT',
          name: 'Large Cand',
          number: 101,
          photoUrl: 'data:image/png;base64,' + 'a'.repeat(2 * 1024 * 1024),
          description: 'Test',
          partyAffiliation: 'Test'
        });
        
        console.time('AddLarge');
        const reqLarge = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/admin/candidates',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataLarge),
            'Authorization': `Bearer ${token}` 
          }
        }, (resLarge) => {
          let bodyLarge = '';
          resLarge.on('data', chunk => bodyLarge += chunk);
          resLarge.on('end', () => {
            console.timeEnd('AddLarge');
            console.timeEnd('Total');
          });
        });
        reqLarge.write(dataLarge);
        reqLarge.end();
      });
    });
    reqSmall.write(dataSmall);
    reqSmall.end();
  });
});

reqLogin.write(loginData);
reqLogin.end();
