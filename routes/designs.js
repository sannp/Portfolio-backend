const express = require("express");
const router = express.Router();
const Design = require("../models/Designs");

// @route POST / addnew
// @desc Save New Design to DB
router.post("/addnew", async (req, res) => {
	if (
		req.body.title &&
		req.body.imageUrl &&
		req.body.imageAlt &&
		req.body.description
	) {
		const designs = await Design.find();
		if (designs.some((item) => item.title === req.body.title)) {
			res.json({
				success: false,
				message: "Title already present.",
				data: null,
			});
		} else {
			const design = new Design({
				title: req.body.title,
				description: req.body.description,
				imageUrl: req.body.imageUrl,
				imageAlt: req.body.imageAlt,
				badges: req.body.badges,
				button1: req.body.button1,
				button1Url: req.body.button1Url,
				button2: req.body.button2,
				button2Url: req.body.button2Url,
			});
			try {
				const savedProject = await design.save();
				res.json({
					success: true,
					message: "Design Added Successfully",
					data: savedProject,
				});
			} catch (error) {
				res.json({ success: false, message: error, data: null });
			}
		}
	} else {
		res.json({
			success: false,
			message: "Title, ImageUrl, ImageAlt, Description are required.",
			data: null,
		});
	}
});

// @route GET / all
// @desc Get All Designs from DB
router.get("/all", async (req, res) => {
	try {
		const designs = await Design.find().sort("-createdDate");
		res.json({
			success: true,
			message: "Designs retrieved successfully",
			data: designs,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route GET / :designId
// @desc Get Specific Design from DB
router.get("/:designId", async (req, res) => {
	try {
		const design = await Design.findById(req.params.designId);
		res.json({
			success: true,
			message: "Design retrieved successfully",
			data: design,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route PATCH / :designId
// @desc Update Specific Design in DB
router.patch("/:designId", async (req, res) => {
	if (
		req.body.title &&
		req.body.imageUrl &&
		req.body.imageAlt &&
		req.body.description
	) {
		try {
			const updatedDesign = await Design.updateOne(
				{
					_id: req.params.designId,
				},
				{
					$set: {
						title: req.body.title,
						imageUrl: req.body.imageUrl,
						imageAlt: req.body.imageAlt,
						title: req.body.title,
						badges: req.body.badges,
						description: req.body.description,
						button1: req.body.button1,
						button1Url: req.body.button1Url,
						button2: req.body.button2,
						button2Url: req.body.button2Url,
					},
				}
			);
			res.json({
				success: true,
				message: "Design updated successfully",
				data: updatedDesign,
			});
		} catch (error) {
			res.json({ success: false, message: error, data: null });
		}
	} else {
		res.json({
			success: false,
			message: "Title, ImageUrl, ImageAlt, Description are required.",
			data: null,
		});
	}
});

// @route DELETE / :designId
// @desc Delete Specific Design from DB
router.delete("/:designId", async (req, res) => {
	try {
		const deletedDesign = await Design.deleteOne({
			_id: req.params.designId,
		});
		res.json({
			success: true,
			message: "Design deleted successfully",
			data: deletedDesign,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

module.exports = router;
