const express = require('express');
const router = express.Router();
const Project = require('#models/Projects');

// @route GET /
// @desc Get projects with pagination, type filtering, sorting, and search via query params
router.get('/', async (req, res) => {
  try {
    const { type, page, limit, sortBy, sortOrder, search } = req.query;
    
    const query = {};
    if (type) {
      query.type = type.toLowerCase();
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { badges: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting options
    let sortOption = {};
    if (sortBy) {
      const allowedFields = {
        title: 'title',
        date: 'createdDate',
        createdDate: 'createdDate',
      };
      const field = allowedFields[sortBy];
      if (field) {
        const dir = (sortOrder === 'asc' || sortOrder === '1' || sortOrder === 1) ? 1 : -1;
        sortOption[field] = dir;
      }
    } else {
      sortOption.createdDate = -1;
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: {
        items: projects,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// @route GET /type/:type
// @desc Get projects filtered by type with pagination and search support
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { page, limit, search, sortBy, sortOrder } = req.query;

    const lowerType = type.toLowerCase();
    if (lowerType !== 'design' && lowerType !== 'project') {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'design' or 'project'.",
        data: null,
      });
    }

    const query = { type: lowerType };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { badges: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Sorting options
    let sortOption = {};
    if (sortBy) {
      const allowedFields = {
        title: 'title',
        date: 'createdDate',
        createdDate: 'createdDate',
      };
      const field = allowedFields[sortBy];
      if (field) {
        const dir = (sortOrder === 'asc' || sortOrder === '1' || sortOrder === 1) ? 1 : -1;
        sortOption[field] = dir;
      }
    } else {
      sortOption.createdDate = -1;
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .select("-__v");

    res.json({
      success: true,
      message: `Projects of type '${lowerType}' retrieved successfully`,
      data: {
        items: projects,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

// @route POST /
// @desc Create new project
router.post('/', async (req, res) => {
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

    // Validate type
    const validTypes = ["design", "project"];
    if (!validTypes.includes(req.body.type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be 'design' or 'project'.",
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

    // Create new project
    const project = new Project({
      title: req.body.title,
      description: req.body.description,
      imageUrl: req.body.imageUrl,
      imageAlt: req.body.imageAlt,
      badges: req.body.badges || [],
      codeLink: req.body.codeLink,
      previewLink: req.body.previewLink,
      type: req.body.type.toLowerCase(),
    });

    const savedProject = await project.save();
    res.json({
      success: true,
      message: "Project Added Successfully",
      data: savedProject,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
    });
  }
});

// @route PUT /:projectId
// @desc Update specific project
router.put('/:projectId', async (req, res) => {
  try {
    // Validate required fields
    if (
      !req.body.title ||
      !req.body.imageUrl ||
      !req.body.imageAlt ||
      !req.body.description ||
      !req.body.type
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, ImageUrl, ImageAlt, Description, and Type are required.",
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

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.projectId,
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
          imageUrl: req.body.imageUrl,
          imageAlt: req.body.imageAlt,
          badges: req.body.badges || [],
          codeLink: req.body.codeLink,
          previewLink: req.body.previewLink,
          type: req.body.type.toLowerCase(),
        },
      },
      { new: true }
    ).select("-__v");

    if (!updatedProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
        data: null,
      });
    }

    res.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
    });
  }
});

// @route DELETE /:projectId
// @desc Delete specific project
router.delete('/:projectId', async (req, res) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.projectId).select("-__v");

    if (!deletedProject) {
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
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error", 
      data: null 
    });
  }
});

module.exports = router;
