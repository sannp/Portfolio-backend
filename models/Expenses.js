const mongoose = require('mongoose');

const ExpensesSchema = mongoose.Schema({
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
  },
  createdDate: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Expenses', ExpensesSchema);
