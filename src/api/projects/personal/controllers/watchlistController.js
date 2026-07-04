const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import Watchlist model
const Watchlist = require('#models/Watchlist');


// @route GET /
// @desc Get all watchlist items
router.get('/', async (req, res) => {
  try {
    const watchlist = await Watchlist.find();
    res.json({
      success: true,
      message: 'Watchlist retrieved successfully',
      data: watchlist,
    });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

// @route POST /
// @desc Create new watchlist item
router.post('/', async (req, res) => {
  if (req.body.title && req.body.imdbUrl && req.body.type) {
    try {
      const watchlistItem = new Watchlist({
        title: req.body.title,
        imdbUrl: req.body.imdbUrl,
        genres: req.body.genres || [],
        isWatched: req.body.isWatched || false,
        imageUrl: req.body.imageUrl,
        type: req.body.type,
        year: req.body.year,
        imdbRating: req.body.imdbRating,
        runtime: req.body.runtime,
        plot: req.body.plot,
      });
      const savedItem = await watchlistItem.save();
      res.json({
        success: true,
        message: 'Watchlist item added successfully',
        data: savedItem,
      });
    } catch (error) {
      res.json({ success: false, message: error.message, data: null });
    }
  } else {
    res.json({
      success: false,
      message: 'Title, IMDB URL, and Type are required.',
      data: null,
    });
  }
});

// @route PUT /:id
// @desc Update existing watchlist item
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await Watchlist.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title: req.body.title,
          imdbUrl: req.body.imdbUrl,
          genres: req.body.genres,
          isWatched: req.body.isWatched,
          imageUrl: req.body.imageUrl,
          type: req.body.type,
          year: req.body.year,
          imdbRating: req.body.imdbRating,
          runtime: req.body.runtime,
          plot: req.body.plot,
        },
      },
      { new: true }
    );
    if (!updatedItem) {
      return res.json({
        success: false,
        message: 'Watchlist item not found',
        data: null,
      });
    }
    res.json({
      success: true,
      message: 'Watchlist item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

// @route DELETE /:id
// @desc Delete watchlist item
router.delete('/:id', async (req, res) => {
  try {
    const deletedItem = await Watchlist.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.json({
        success: false,
        message: 'Watchlist item not found',
        data: null,
      });
    }
    res.json({
      success: true,
      message: 'Watchlist item deleted successfully',
      data: deletedItem,
    });
  } catch (error) {
    res.json({ success: false, message: error.message, data: null });
  }
});

module.exports = router;
