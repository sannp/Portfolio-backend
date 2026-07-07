const mongoose = require("mongoose");

const ProjectsSchema = mongoose.Schema({
	type: {
		type: String,
		required: true,
		enum: ["design", "project"]
	},
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
	codeLink: {
		type: String,
	},
	previewLink: {
		type: String,
	},
	createdDate: {
		type: Date,
		default: Date.now,
	}
});

module.exports = mongoose.model("Projects", ProjectsSchema);