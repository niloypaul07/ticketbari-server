function verifyVendor(req, res, next) {
  if (req.user?.role !== 'vendor' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Vendor access required' });
  }
  next();
}

module.exports = verifyVendor;
