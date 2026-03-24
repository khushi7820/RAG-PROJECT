const http = require('http');

const payload = JSON.stringify({
  "to": "15558903791",
  "from": "917820870519",
  "event": "MoMessage",
  "channel": "whatsapp",
  "content": {
    "media": {
      "url": "https://engees11zamedia.11za.in/prateektosniwalpvt/Receive/AUD/AUD-22104663569274519.ogg",
      "type": "audio"
    },
    "contentType": "media"
  },
  "whatsapp": {
    "senderName": "Khushi Dinesh Krishnani"
  },
  "messageId": "wamid.TESTAUDIO123",
  "timestamp": "2026-03-24T12:06:13Z",
  "receivedAt": "2026-03-24T12:06:13Z",
  "isResponded": false,
  "isin24window": true
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook/whatsapp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', error => console.error(error));
req.write(payload);
req.end();
