const mongoose = require("mongoose");

const BlogPostsSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	value: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		required: true,
	},
	intro: {
		type: String,
		required: true,
	},
	createdDate: {
		type: Date,
		default: Date.now,
	},
});

const portfolioDb = mongoose.connection.useDb('portfolio');
module.exports = portfolioDb.model("BlogPosts", BlogPostsSchema);
