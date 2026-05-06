const config = require('config');

/**
 * Authentication middleware for API endpoints
 * Checks for a valid API secret in the 'x-api-secret' header
 */
const authenticateApiSecret = (req, res, next) => {
  const providedSecret = req.headers['x-api-secret'];
  const expectedSecret = config.get('security.apiSecret') || process.env.API_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: API secret not configured',
      data: null
    });
  }

  if (!providedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing API secret',
      data: null
    });
  }

  next();
};

module.exports = {
  authenticateApiSecret
};
