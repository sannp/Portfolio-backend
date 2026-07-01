const mongoose = require("mongoose");

const WatchlistSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  imdbUrl: {
    type: String,
    required: true,
  },
  genres: {
    type: [String],
    default: [],
  },
  isWatched: {
    type: Boolean,
    default: false,
  },
  imageUrl: {
    type: String,
  },
  type: {
    type: String,
    required: true,
  },
  year: {
    type: String,
  },
  imdbRating: {
    type: String,
  },
  runtime: {
    type: String,
  },
  plot: {
    type: String,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

const personalDb = mongoose.connection.useDb('personal');
const Watchlist = personalDb.model("Watchlist", WatchlistSchema);

module.exports = Watchlist;
