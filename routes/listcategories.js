const express = require("express");
const router = express.Router();
const ListCategory = require("../models/ListCategories");

// @route POST / addnew
// @desc Save New ListCategory to DB
router.post("/addnew", async (req, res) => {
	if (req.body.title && req.body.value && req.body.category) {
		const listCategories = await ListCategory.find();
		if (listCategories.some((item) => item.title === req.body.title)) {
			res.json({
				success: false,
				message: "Title already present.",
				data: null,
			});
		} else {
			const listCategory = new ListCategory({
				title: req.body.title,
				value: req.body.value,
				category: req.body.category,
				id: listCategories.length + 1,
			});
			try {
				const savedListCategory = await listCategory.save();
				res.json({
					success: true,
					message: "ListCategory Added Successfully",
					data: savedListCategory,
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
// @desc Get All ListCategories from DB
router.get("/all", async (req, res) => {
	try {
		const listCategories = await ListCategory.find();
		res.json({
			success: true,
			message: "Listcatgories Retrieved Successfully",
			data: listCategories,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route GET / :listCategoryId
// @desc Get Specific ListCategory from DB
router.get("/:listCategoryId", async (req, res) => {
	try {
		const listCategory = await ListCategory.findById(
			req.params.listCategoryId
		);
		res.json({
			success: true,
			message: "ListCategory retrieved successfully",
			data: listCategory,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route PATCH / :listCategoryId
// @desc Update Specific ListCategory in DB
router.patch("/:listCategoryId", async (req, res) => {
	if (req.body.title && req.body.value && req.body.category && req.body.id) {
		try {
			const updatedListcategory = await ListCategory.updateOne(
				{
					_id: req.params.listCategoryId,
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
				message: "ListCategory updated successfully",
				data: updatedListcategory,
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

// @route DELETE / :listCategoryId
// @desc Delete Specific ListCategory from DB
router.delete("/:listCategoryId", async (req, res) => {
	try {
		const deletedListcategory = await ListCategory.deleteOne({
			_id: req.params.listCategoryId,
		});
		res.json({
			success: true,
			message: "ListCategory deleted successfully",
			data: deletedListcategory,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

module.exports = router;
