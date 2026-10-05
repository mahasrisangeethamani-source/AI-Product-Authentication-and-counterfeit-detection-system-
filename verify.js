const { runAIDetection } = require('./_lib/detection');

// ⚠️ Note: serverless functions are stateless — this in-memory array only
// persists across "warm" invocations, not guaranteed long-term storage.
global.scanHistory = global.scanHistory || [];

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { brand, code, imageHint } = req.body || {};

  if (!brand || !code) {
    res.status(400).json({ error: '🚫 Brand and product code are required.' });
    return;
  }

  const result = runAIDetection(brand, code, imageHint);
  global.scanHistory.unshift(result);
  if (global.scanHistory.length > 25) global.scanHistory.pop();

  res.status(200).json(result);
};
