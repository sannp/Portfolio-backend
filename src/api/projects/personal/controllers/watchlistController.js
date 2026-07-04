const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import Watchlist model
const Watchlist = require('#models/Watchlist');


// @route GET /
// @desc Get watchlist items with pagination, isWatched status filtering, and sorting via query params
router.get('/', async (req, res) => {
  try {
    const { isWatched, page, limit, sortBy, sortOrder } = req.query;
    
    const query = {};
    if (isWatched !== undefined) {
      query.isWatched = isWatched === 'true';
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting options
    let sortOption = {};
    if (sortBy) {
      const allowedFields = {
        rating: 'imdbRating',
        imdbRating: 'imdbRating',
        title: 'title',
        date: 'createdDate',
        createdDate: 'createdDate',
      };
      const field = allowedFields[sortBy];
      if (field) {
        const dir = (sortOrder === 'asc' || sortOrder === '1' || sortOrder === 1) ? 1 : -1;
        sortOption[field] = dir;
      }
    }

    const total = await Watchlist.countDocuments(query);
    const watchlist = await Watchlist.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      message: 'Watchlist retrieved successfully',
      data: {
        items: watchlist,
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

// @route GET /type/:type
// @desc Get watchlist items filtered by type, optionally isWatched status, and genre/genres via query params with pagination and search
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { isWatched, genre, genres, page, limit, search } = req.query;
    
    const query = { type };
    if (isWatched !== undefined) {
      query.isWatched = isWatched === 'true';
    }
    if (genre) {
      query.genres = genre;
    } else if (genres) {
      const genreList = Array.isArray(genres) ? genres : genres.split(',');
      query.genres = { $in: genreList };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { genres: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await Watchlist.countDocuments(query);
    const watchlist = await Watchlist.find(query).skip(skip).limit(limitNum);

    res.json({
      success: true,
      message: `Watchlist items of type '${type}' retrieved successfully`,
      data: {
        items: watchlist,
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
