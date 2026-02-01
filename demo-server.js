const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>AlphaSignal - Financial Intelligence</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #2563eb; }
    .tier { border: 1px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .price { font-size: 24px; font-weight: bold; color: #059669; }
    button { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>📊 AlphaSignal</h1>
  <p>AI-Powered Financial Intelligence</p>
  
  <div class="tier">
    <h2>Free Tier</h2>
    <div class="price">$0/month</div>
    <ul>
      <li>Weekly market digests</li>
      <li>Basic Twitter sentiment</li>
    </ul>
    <button>Get Started</button>
  </div>
  
  <div class="tier">
    <h2>Pro Tier</h2>
    <div class="price">$49/month</div>
    <ul>
      <li>Daily market briefings</li>
      <li>Contradiction alerts</li>
      <li>Watchlist monitoring</li>
    </ul>
    <button>Subscribe</button>
  </div>
  
  <div class="tier">
    <h2>Elite Tier</h2>
    <div class="price">$199/month</div>
    <ul>
      <li>Real-time alerts</li>
      <li>Custom research</li>
      <li>1:1 consultations</li>
    </ul>
    <button>Subscribe</button>
  </div>
  
  <p><small>Powered by AI • Real-time analysis • Contradiction detection</small></p>
</body>
</html>
    `);
  } else if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/api/demo-report') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      summary: 'Markets showing mixed signals. Tech sector bullish, crypto volatile.',
      keyFindings: [
        'Bitcoin holding above $80k support',
        'Tesla AI day driving sentiment',
        'Fed policy remains key catalyst'
      ],
      contradictions: 2,
      sentiment: 'cautiously-bullish'
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AlphaSignal demo running on port ${PORT}`);
});
