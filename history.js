global.scanHistory = global.scanHistory || [];

module.exports = (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json(global.scanHistory);
    return;
  }

  if (req.method === 'DELETE') {
    global.scanHistory = [];
    res.status(200).json({ message: '🗑️ History cleared' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
