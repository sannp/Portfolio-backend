const mongoose = require("mongoose");

const DesignsSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: true,
	},
	imageUrl: {
		type: String,
		required: true,
	},
	imageAlt: {
		type: String,
		default: "placeholder",
	},
	badges: {
		type: Array,
		default: [],
	},
	button1: {
		type: String,
	},
	button1Url: {
		type: String,
	},
	button2: {
		type: String,
	},
	button2Url: {
		type: String,
	},
	createdDate: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Designs", DesignsSchema);
