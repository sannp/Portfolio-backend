const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expenses = require('#models/Expenses');

// @route GET /
// @desc Get all expenses with optional pagination and date filtering
router.get('/', async (req, res) => {
  try {
    const { page, limit, startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const isPagingEnabled = limit !== '-1' && limit !== 'all';

    let dbQuery = Expenses.find(query).sort({ date: -1 });
    const total = await Expenses.countDocuments(query);

    if (isPagingEnabled) {
      dbQuery = dbQuery.skip(skip).limit(limitNum);
    }

    const expenses = await dbQuery;

    res.json({
      success: true,
      message: 'Expenses retrieved successfully',
      data: {
        items: expenses,
        pagination: {
          total,
          page: isPagingEnabled ? pageNum : 1,
          limit: isPagingEnabled ? limitNum : total,
          totalPages: isPagingEnabled ? Math.ceil(total / limitNum) : 1,
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
      _id: req.body._id || req.body.id || new mongoose.Types.ObjectId().toString(),
      date: req.body.date,
      place: req.body.place,
      amount: req.body.amount,
      type: req.body.type,
      account: req.body.account,
      isAccounted: req.body.isAccounted,
      information: req.body.information,
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
