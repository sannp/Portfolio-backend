const mongoose = require('mongoose');

const ExpensesSchema = mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  place: {
    type: String,
    required: true,
  },
  category: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['DR', 'CR'],
  },
  account: {
    type: String,
  },
  isAccounted: {
    type: Boolean,
    default: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  note: {
    type: String,
  },
  information: {
    type: String,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expenses', ExpensesSchema);
