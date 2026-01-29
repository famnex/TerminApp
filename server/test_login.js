const axios = require('axios');

async function testLogin() {
    try {
        const res = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        console.log('LOGIN SUCCESS:', res.data.success);
        console.log('TOKEN received:', !!res.data.token);
    } catch (err) {
        console.error('LOGIN FAILED:', err.response ? err.response.data : err.message);
    }
}

testLogin();
