const ServerLog = require('../../models/ServerLog');

// Fields to mask for privacy/security
const SENSITIVE_KEYS = ['authorization', 'x-api-secret', 'password', 'token', 'apiKey', 'secret', 'key'];

const maskSensitiveData = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk));
    if (isSensitive) {
      masked[key] = '***MASKED***';
    } else if (value && typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Clone/mask request body and headers
  const sanitizedHeaders = maskSensitiveData(req.headers);
  const sanitizedBody = maskSensitiveData(req.body);
  const sanitizedQuery = maskSensitiveData(req.query);
  
  // Capture response payload for error reporting
  let responseBody = null;
  const originalJson = res.json;
  const originalSend = res.send;
  
  res.json = function(body) {
    responseBody = body;
    return originalJson.apply(res, arguments);
  };
  
  res.send = function(body) {
    if (!responseBody) {
      try {
        responseBody = typeof body === 'string' ? JSON.parse(body) : body;
      } catch (e) {
        responseBody = body;
      }
    }
    return originalSend.apply(res, arguments);
  };

  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - start;
      const statusCode = res.statusCode;
      
      let errorMessage = null;
      if (statusCode >= 400 && responseBody) {
        errorMessage = typeof responseBody === 'object' 
          ? (responseBody.message || responseBody.error || JSON.stringify(responseBody)) 
          : String(responseBody);
      }

      const logEntry = new ServerLog({
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        headers: sanitizedHeaders,
        query: sanitizedQuery,
        body: sanitizedBody,
        statusCode,
        responseTime,
        errorMessage,
      });

      await logEntry.save();
    } catch (err) {
      console.error('Failed to save server log:', err);
    }
  });

  next();
};

module.exports = { requestLogger };
