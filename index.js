const express = require('express');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Favicon handler to prevent 404
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Root health check for deployment
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate single keypair (for testing)
app.get('/api/generate', (req, res) => {
  const keypair = Keypair.generate();
  res.json({
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
    secretKey: Array.from(keypair.secretKey)
  });
});

// Vanity address generation
app.post('/api/vanity', (req, res) => {
  const { prefix, suffix, caseSensitive, maxAttempts = 500000 } = req.body;

  if (!prefix && !suffix) {
    return res.status(400).json({ error: 'Prefix or suffix required' });
  }

  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  
  const isValidBase58 = (str) => {
    if (!str) return true;
    return str.split('').every(char => BASE58_ALPHABET.includes(char));
  };

  if (!isValidBase58(prefix) || !isValidBase58(suffix)) {
    return res.status(400).json({ error: 'Invalid Base58 characters. Avoid: 0, O, I, l' });
  }

  function matchesPattern(address) {
    let addr = address;
    let pre = prefix || '';
    let suf = suffix || '';

    if (!caseSensitive) {
      addr = addr.toLowerCase();
      pre = pre.toLowerCase();
      suf = suf.toLowerCase();
    }

    return (!pre || addr.startsWith(pre)) && (!suf || addr.endsWith(suf));
  }

  const startTime = Date.now();
  let attempts = 0;

  while (attempts < maxAttempts) {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    attempts++;

    if (matchesPattern(publicKey)) {
      const elapsed = (Date.now() - startTime) / 1000;
      return res.json({
        found: true,
        publicKey: publicKey,
        privateKey: bs58.encode(keypair.secretKey),
        secretKey: Array.from(keypair.secretKey),
        attempts,
        timeSeconds: elapsed,
        speed: Math.round(attempts / elapsed)
      });
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  res.json({
    found: false,
    attempts,
    timeSeconds: elapsed,
    speed: Math.round(attempts / elapsed),
    message: `No match found in ${maxAttempts.toLocaleString()} attempts. Try again or use a shorter pattern.`
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         SOLANA VANITY WALLET GENERATOR                    ║
║                                                           ║
║  🚀 Server running on port ${PORT}                          ║
║  📱 Open the Webview tab to use the generator             ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
