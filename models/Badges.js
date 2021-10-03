const mongoose = require("mongoose");

const BadgesSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	id: {
		type: String,
		required: true,
	},
	bgColor: {
		type: String,
		required: true,
	},
	color: {
		type: String,
		default: "#fffff",
	},
	createdDate: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Badges", BadgesSchema);
