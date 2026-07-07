const express = require('express');
const router = express.Router();
const Expenses = require('#models/Expenses');

// @route GET /
// @desc Get all expenses with optional pagination
router.get('/', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await Expenses.countDocuments();
    const expenses = await Expenses.find()
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      message: 'Expenses retrieved successfully',
      data: {
        items: expenses,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

// @route POST /
// @desc Create new expense
router.post('/', async (req, res) => {
  try {
    const newExpense = new Expenses({
      date: req.body.date,
      place: req.body.place,
      amount: req.body.amount,
      type: req.body.type,
      account: req.body.account,
      isExpense: req.body.isExpense,
      isIncome: req.body.isIncome,
      category: req.body.category,
      tags: req.body.tags,
      note: req.body.note,
    });
    
    const savedExpense = await newExpense.save();
    res.json({
      success: true,
      message: 'Expense added successfully',
      data: savedExpense,
    });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

// @route PUT /:id
// @desc Update expense
router.put('/:id', async (req, res) => {
  try {
    const updatedExpense = await Expenses.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    if (!updatedExpense) {
      return res.json({
        success: false,
        message: 'Expense not found',
        data: null,
      });
    }
    
    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense,
    });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

// @route DELETE /:id
// @desc Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const deletedExpense = await Expenses.findByIdAndDelete(req.params.id);
    if (!deletedExpense) {
      return res.json({
        success: false,
        message: 'Expense not found',
        data: null,
      });
    }
    res.json({
      success: true,
      message: 'Expense deleted successfully',
      data: deletedExpense,
    });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

module.exports = router;
