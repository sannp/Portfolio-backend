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
  isExpense: {
    type: Boolean,
    default: true,
  },
  isIncome: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
  },
  tags: {
    type: [String],
    default: [],
  },
  note: {
    type: String,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Expenses', ExpensesSchema);
