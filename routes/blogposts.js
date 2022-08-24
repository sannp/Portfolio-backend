const express = require("express");
const router = express.Router();
const BlogPost = require("../models/BlogPosts");

// @route POST / addnew
// @desc Add New BlogPost to DB
router.post("/addnew", async (req, res) => {
	if (
		req.body.title &&
		req.body.value &&
		req.body.content &&
		req.body.intro
	) {
		const blogPost = new BlogPost({
			title: req.body.title,
			value: req.body.value,
			content: req.body.content,
			intro: req.body.intro,
		});
		try {
			const savedPost = await blogPost.save();
			res.json({
				success: true,
				message: "BlogPost Added Successfully",
				data: savedPost,
			});
		} catch (error) {
			res.json({ success: false, message: error, data: null });
		}
	} else {
		res.json({
			success: false,
			message: "Title, Value, Content and Content_mini are required.",
			data: null,
		});
	}
});

// @route GET / all
// @desc Get All BlogPosts from DB
router.get("/all", async (req, res) => {
	try {
		const blogPosts = await BlogPost.find();
		res.json({
			success: true,
			message: "BlogPosts retrieved successfully",
			data: blogPosts,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route GET / :postId
// @desc Get Specific Blogpost from DB
router.get("/:postId", async (req, res) => {
	try {
		const post = await BlogPost.findById(req.params.postId);
		res.json({
			success: true,
			message: "Blogpost retrieved successfully",
			data: post,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

// @route DELETE / :postId
// @desc Delete Specific BlogPost from DB
router.delete("/:postId", async (req, res) => {
	try {
		const deletedPost = await BlogPost.deleteOne({
			_id: req.params.postId,
		});
		res.json({
			success: true,
			message: "BlogPost deleted successfully",
			data: deletedPost,
		});
	} catch (error) {
		res.json({ success: false, message: error, data: null });
	}
});

module.exports = router;
