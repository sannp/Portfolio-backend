const mongoose = require('mongoose');

const ServerLogSchema = mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
  },
  headers: {
    type: mongoose.Schema.Types.Mixed,
  },
  query: {
    type: mongoose.Schema.Types.Mixed,
  },
  body: {
    type: mongoose.Schema.Types.Mixed,
  },
  statusCode: {
    type: Number,
  },
  responseTime: {
    type: Number, // In milliseconds
  },
  errorMessage: {
    type: String,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ServerLogs', ServerLogSchema);
