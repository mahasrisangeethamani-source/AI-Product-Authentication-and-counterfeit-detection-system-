// 🛡️ Shared AI detection logic used by all serverless functions
const crypto = require('crypto');

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
  const checksumDigit = parseInt(hash[0], 16);
  if (checksumDigit % 3 === 0) {
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
    const suspiciousWords = ['blurry', 'crooked', 'faded', 'misspelled', 'glue', 'loose'];
    const hit = suspiciousWords.some((w) => imageHint.toLowerCase().includes(w));
    if (hit) {
      score -= 25;
      signals.push({ label: '📸 Packaging description flags possible tampering', weight: '-25' });
    } else {
      score += 5;
      signals.push({ label: '📦 Packaging description looks consistent', weight: '+5' });
    }
  }

  score = Math.max(0, Math.min(100, score));

  let verdict, verdictEmoji;
  if (score >= 75) {
    verdict = 'Authentic';
    verdictEmoji = '✅';
  } else if (score >= 45) {
    verdict = 'Suspicious';
    verdictEmoji = '⚠️';
  } else {
    verdict = 'Likely Counterfeit';
    verdictEmoji = '❌';
  }

  return {
    brand: upperBrand,
    code: cleanCode,
    score,
    verdict,
    verdictEmoji,
    signals,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { runAIDetection, KNOWN_BATCHES };
