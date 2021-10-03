const express = require("express");
const router = express.Router();
const Category = require("../models/Categories");

// @route POST / addnew
// @desc Save New Category to DB
router.post("/addnew", async (req, res) => {
	if (req.body.title && req.body.value && req.body.category) {
		const categories = await Category.find();
		if (categories.some((item) => item.title === req.body.title)) {
			res.json({
				success: false,
				message: "Title already present.",
				data: null,
			});
		} else {
			const category = new Category({
				title: req.body.title,
				value: req.body.value,
				category: req.body.category,
				id: categories.length + 1,
			});
			try {
				const savedCategory = await category.save();
				res.json({
					success: true,
					message: "Category Added Successfully",
					data: savedCategory,
				});
			} catch (error) {
				res.json({ success: false, message: error, data: null });
			}
		}
	} else {
		res.json({
			success: false,
			message: "Title, Value, Category are required.",
			data: null,
		});
	}
});

// @route GET / all
// @desc Get All Categories from DB
router.get("/all", async (req, res) => {
	try {
		const categories = await Category.find();
		res.json({
			success: true,
			message: "Catgories Retrieved Successfully",
			data: categories,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route GET / :categoryId
// @desc Get Specific Category from DB
router.get("/:categoryId", async (req, res) => {
	try {
		const category = await Category.findById(req.params.categoryId);
		res.json({
			success: true,
			message: "Category retrieved successfully",
			data: category,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route PATCH / :categoryId
// @desc Update Specific Category in DB
router.patch("/:categoryId", async (req, res) => {
	if (req.body.title && req.body.value && req.body.category && req.body.id) {
		try {
			const updatedCategory = await Category.updateOne(
				{
					_id: req.params.categoryId,
				},
				{
					$set: {
						title: req.body.title,
						value: req.body.value,
						category: req.body.category,
						id: req.body.id,
					},
				}
			);
			res.json({
				success: true,
				message: "Category updated successfully",
				data: updatedCategory,
			});
		} catch (error) {
			res.json({ success: false, message: error, data: null });
		}
	} else {
		res.json({
			success: false,
			message: "Title, Value, Category, Id are required.",
			data: null,
		});
	}
});

// @route DELETE / :categoryId
// @desc Delete Specific Category from DB
router.delete("/:categoryId", async (req, res) => {
	try {
		const deletedCategory = await Category.deleteOne({
			_id: req.params.categoryId,
		});
		res.json({
			success: true,
			message: "Category deleted successfully",
			data: deletedCategory,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

module.exports = router;
