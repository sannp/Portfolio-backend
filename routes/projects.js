const express = require("express");
const router = express.Router();
const Project = require("../models/Projects");

// @route POST / addnew
// @desc Save New Project to DB
router.post("/addnew", async (req, res) => {
	if (
		req.body.title &&
		req.body.imageUrl &&
		req.body.imageAlt &&
		req.body.description
	) {
		const projects = await Project.find();
		if (projects.some((item) => item.title === req.body.title)) {
			res.json({
				success: false,
				message: "Title already present.",
				data: null,
			});
		} else {
			const project = new Project({
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
				const savedProject = await project.save();
				res.json({
					success: true,
					message: "Project Added Successfully",
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
// @desc Get All Projects from DB
router.get("/all", async (req, res) => {
	try {
		const projects = await Project.find();
		res.json({
			success: true,
			message: "Projects retrieved successfully",
			data: projects,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route GET / :projectId
// @desc Get Specific Project from DB
router.get("/:projectId", async (req, res) => {
	try {
		const project = await Project.findById(req.params.projectId);
		res.json({
			success: true,
			message: "Project retrieved successfully",
			data: project,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route PATCH / :projectId
// @desc Update Specific Project in DB
router.patch("/:projectId", async (req, res) => {
	if (
		req.body.title &&
		req.body.imageUrl &&
		req.body.imageAlt &&
		req.body.description
	) {
		try {
			const updatedProject = await Project.updateOne(
				{
					_id: req.params.projectId,
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
				message: "Project updated successfully",
				data: updatedProject,
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

// @route DELETE / :projectId
// @desc Delete Specific Project from DB
router.delete("/:projectId", async (req, res) => {
	try {
		const deletedProject = await Project.deleteOne({
			_id: req.params.projectId,
		});
		res.json({
			success: true,
			message: "Project deleted successfully",
			data: deletedProject,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

module.exports = router;
