const express = require('express');
const router = express.Router();
const Project = require('#models/Projects');

// @route POST / addnew
// @desc Save New Project to DB
router.post("/addnew", async (req, res) => {
  try {
    // Validate required fields
    if (
      !req.body.title ||
      !req.body.imageUrl ||
      !req.body.imageAlt ||
      !req.body.description ||
      !req.body.type
    ) {
      return res.json({
        success: false,
        message: "Title, ImageUrl, ImageAlt, Description, and Type are required.",
        data: null,
      });
    }

    // Check if title already exists (prevents duplicates)
    const existingProject = await Project.findOne({ title: req.body.title });
    if (existingProject) {
      return res.json({
        success: false,
        message: "Title already present.",
        data: null,
      });
    }

    // Validate type
    const validTypes = ["design", "project"];
    if (!validTypes.includes(req.body.type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'design' or 'project'.",
        data: null,
      });
    }

    // Create new project
    const project = new Project({
      title: req.body.title,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      imageAlt: req.body.imageAlt,
      badges: req.body.badges || [],
      button1: req.body.button1,
      button1Url: req.body.button1Url,
      button2: req.body.button2,
      button2Url: req.body.button2Url,
      type: req.body.type.toLowerCase(),
    });

    const savedProject = await project.save();
    res.json({
      success: true,
      message: "Project Added Successfully",
      data: savedProject,
    });
  } catch (error) {
    console.error("Error in addnew route:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
    });
  }
});

// @route GET / all
// @desc Get All Projects from DB
router.get("/all", async (req, res) => {
  try {
    // Optional query parameter to filter by type
    const query = {};
    if (req.query.type) {
      query.type = req.query.type.toLowerCase();
    }

    const projects = await Project.find(query)
      .sort({ createdDate: -1 })
      .select("-__v");
    
    res.json({
      success: true,
      message: "Projects retrieved successfully",
      data: projects,
    });
  } catch (error) {
    console.error("Error in all route:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
    });
  }
});

// @route GET / :projectId
// @desc Get Specific Project from DB
router.get("/:projectId", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .select("-__v");
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
        data: null,
      });
    }

    res.json({
      success: true,
      message: "Project retrieved successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error in specific project route:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
    });
  }
});

// @route PATCH / :projectId
// @desc Update Specific Project in DB
router.patch("/:projectId", async (req, res) => {
  try {
    // Validate required fields
    if (
      !req.body.title ||
      !req.body.imageUrl ||
      !req.body.imageAlt ||
      !req.body.description
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, ImageUrl, ImageAlt, Description are required.",
        data: null,
      });
    }

    // Update project
    const updatedProject = await Project.updateOne(
      { _id: req.params.projectId },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
          imageUrl: req.body.imageUrl,
          imageAlt: req.body.imageAlt,
          badges: req.body.badges || [],
          button1: req.body.button1,
          button1Url: req.body.button1Url,
          button2: req.body.button2,
          button2Url: req.body.button2Url,
        },
      }
    );

    if (!updatedProject.modifiedCount) {
      return res.status(404).json({
        success: false,
        message: "Project not found or no changes made",
        data: null,
      });
    }

    res.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });

  } catch (error) {
    console.error("Error in update route:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
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

    if (!deletedProject.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
        data: null,
      });
    }

    res.json({
      success: true,
      message: "Project deleted successfully",
      data: deletedProject,
    });

  } catch (error) {
    console.error("Error in delete route:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
    });
  }
});

module.exports = router;
