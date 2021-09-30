const mongoose = require("mongoose");

const ListCategoriesSchema = mongoose.Schema({
	title: {
		type: String,
		required: true,
	},
	value: {
		type: String,
		required: true,
	},
	id: {
		type: String,
		required: true,
	},
	category: {
		type: String,
		required: true,
	},
	createdDate: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("ListCategories", ListCategoriesSchema);
