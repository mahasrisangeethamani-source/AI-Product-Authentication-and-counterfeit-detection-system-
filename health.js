const { KNOWN_BATCHES } = require('./_lib/detection');

module.exports = (req, res) => {
  res.status(200).json({
    status: '💖 AuthentiGuard AI backend is running',
    knownBrands: Object.keys(KNOWN_BATCHES),
  });
};
