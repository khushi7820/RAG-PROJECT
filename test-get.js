const http = require('http');

const url = 'http://localhost:3000/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=rag_whatsapp_token_2024&hub.challenge=test_challenge';

http.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
    if (res.statusCode === 200 && data === 'test_challenge') {
      console.log('✅ Verification successful!');
    } else {
      console.log('❌ Verification failed!');
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
