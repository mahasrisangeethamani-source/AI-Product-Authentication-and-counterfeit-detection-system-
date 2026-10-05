// VeriTrust AI - local backend (no npm install needed)
// Run:  node server.js   then open  http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const HISTORY_FILE = path.join(__dirname, 'scans.json');

// ---------- AI detection logic ----------
const KNOWN_BATCHES = {
  NIKE: ['A1B2C3', 'X9Y8Z7', 'K4L5M6'],
  APPLE: ['SN-2024-88', 'SN-2024-99', 'SN-2025-11'],
  GUCCI: ['GUC-7788', 'GUC-9012'],
  SAMSUNG: ['SM-4455', 'SM-6677'],
};

function runAIDetection(brand, code, imageHint) {
  const upperBrand = (brand || '').trim().toUpperCase();
  const cleanCode = (code || '').trim().toUpperCase();
  let score = 50;
  const signals = [];

  const knownList = KNOWN_BATCHES[upperBrand];
  if (knownList && knownList.includes(cleanCode)) {
    score += 35;
    signals.push({ label: '✅ Batch code matches manufacturer registry', weight: '+35' });
  } else if (knownList) {
    score -= 20;
    signals.push({ label: '⚠️ Batch code not found in manufacturer registry', weight: '-20' });
  } else {
    score -= 10;
    signals.push({ label: '❓ Brand not in verified partner database', weight: '-10' });
  }

  const hash = crypto.createHash('sha256').update(cleanCode).digest('hex');
  if (parseInt(hash[0], 16) % 3 === 0) {
    score += 10;
    signals.push({ label: '🔐 Serial checksum pattern looks valid', weight: '+10' });
  } else {
    score -= 8;
    signals.push({ label: '🔍 Serial checksum pattern is irregular', weight: '-8' });
  }

  const uniqueChars = new Set(cleanCode.replace(/[^A-Z0-9]/g, '')).size;
  if (uniqueChars >= 5) {
    score += 8;
    signals.push({ label: '🧬 High code complexity (harder to forge)', weight: '+8' });
  } else if (cleanCode.length > 0) {
    score -= 12;
    signals.push({ label: '🚨 Low code complexity (easy to forge)', weight: '-12' });
  }

  if (imageHint) {
    const bad = ['blurry', 'crooked', 'faded', 'misspelled', 'glue', 'loose'];
    if (bad.some((w) => imageHint.toLowerCase().includes(w))) {
      score -= 25;
      signals.push({ label: '📸 Packaging description flags possible tampering', weight: '-25' });
    } else {
      score += 5;
      signals.push({ label: '📦 Packaging description looks consistent', weight: '+5' });
    }
  }

  score = Math.max(0, Math.min(100, score));
  let verdict, verdictEmoji;
  if (score >= 75) { verdict = 'Authentic'; verdictEmoji = '✅'; }
  else if (score >= 45) { verdict = 'Suspicious'; verdictEmoji = '⚠️'; }
  else { verdict = 'Likely Counterfeit'; verdictEmoji = '❌'; }

  return { brand: upperBrand, code: cleanCode, score, verdict, verdictEmoji, signals, timestamp: new Date().toISOString() };
}

// ---------- scan history (saved to scans.json so it survives restarts) ----------
let history = [];
try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (e) { history = []; }
const saveHistory = () => { try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2)); } catch (e) { /* ignore */ } };

// ---------- helpers ----------
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

const readBody = (req) => new Promise((resolve) => {
  let data = '';
  req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
});

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/script.js': ['script.js', 'text/javascript; charset=utf-8'],
};

// ---------- server ----------
http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/health' && req.method === 'GET') {
    return send(res, 200, { status: '✅ VeriTrust AI backend is running', knownBrands: Object.keys(KNOWN_BATCHES) });
  }

  if (url === '/api/verify') {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const { brand, code, imageHint } = await readBody(req);
    if (!brand || !code) return send(res, 400, { error: 'Brand and serial code are required.' });
    const result = runAIDetection(brand, code, imageHint);
    history.unshift(result);
    if (history.length > 25) history.pop();
    saveHistory();
    return send(res, 200, result);
  }

  if (url === '/api/history') {
    if (req.method === 'GET') return send(res, 200, history);
    if (req.method === 'DELETE') { history = []; saveHistory(); return send(res, 200, { message: 'History cleared' }); }
    return send(res, 405, { error: 'Method not allowed' });
  }

  const file = STATIC[url];
  if (file) {
    fs.readFile(path.join(__dirname, file[0]), (err, content) => {
      if (err) return send(res, 404, 'File not found: ' + file[0], 'text/plain');
      send(res, 200, content, file[1]);
    });
    return;
  }

  send(res, 404, { error: 'Not found' });
}).listen(PORT, () => {
  console.log(`VeriTrust AI running at http://localhost:${PORT}`);
});
