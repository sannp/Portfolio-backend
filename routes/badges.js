const express = require("express");
const router = express.Router();
const Badge = require("../models/Badges");

// @route POST / addnew
// @desc Save New Badge to DB
router.post("/addnew", async (req, res) => {
	if (req.body.title && req.body.bgColor) {
		const badges = await Badge.find();
		if (badges.some((item) => item.title === req.body.title)) {
			res.json({
				success: false,
				message: "Title already present.",
				data: null,
			});
		} else {
			const badge = new Badge({
				title: req.body.title,
				id: badges.length + 1,
				bgColor: req.body.bgColor,
				color: req.body.color,
			});
			try {
				const savedBadge = await badge.save();
				res.json({
					success: true,
					message: "Badge Added Successfully",
					data: savedBadge,
				});
			} catch (error) {
				res.json({ success: false, message: error, data: null });
			}
		}
	} else {
		res.json({
			success: false,
			message: "Title, BgColor are required.",
			data: null,
		});
	}
});

// @route GET / all
// @desc Get All Badges from DB
router.get("/all", async (req, res) => {
	try {
		const badges = await Badge.find();
		res.json({
			success: true,
			message: "Badges Retrieved Successfully",
			data: badges,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route GET / :badgeId
// @desc Get Specific Badge from DB
router.get("/:badgeId", async (req, res) => {
	try {
		const badge = await Badge.findById(req.params.badgeId);
		res.json({
			success: true,
			message: "Badge retrieved successfully",
			data: badge,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route PATCH / :badgeId
// @desc Update Specific Badge in DB
router.patch("/:badgeId", async (req, res) => {
	if (req.body.title && req.body.value && req.body.badge && req.body.id) {
		try {
			const updatedBadge = await Badge.updateOne(
				{
					_id: req.params.badgeId,
				},
				{
					$set: {
						title: req.body.title,
						bgColor: req.body.bgColor,
						color: req.body.color,
						id: req.body.id,
					},
				}
			);
			res.json({
				success: true,
				message: "Badge updated successfully",
				data: updatedBadge,
			});
		} catch (error) {
			res.json({ success: false, message: error, data: null });
		}
	} else {
		res.json({
			success: false,
			message: "Title, Value, Badge, Id are required.",
			data: null,
		});
	}
});

// @route DELETE / :badgeId
// @desc Delete Specific Badge from DB
router.delete("/:badgeId", async (req, res) => {
	try {
		const deletedBadge = await Badge.deleteOne({
			_id: req.params.badgeId,
		});
		res.json({
			success: true,
			message: "Badge deleted successfully",
			data: deletedBadge,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

module.exports = router;
