const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');
const mongoose = require('mongoose');
const dbManager = require('../../../../../../src/database/dbConfig');
const config = require('config');

// Use memory storage - file will be in req.file.buffer
const storage = multer.memoryStorage();

const store = multer({
  storage,
  limits: { fileSize: config.get('upload.maxFileSize') },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Generate unique filename
function generateFilename(originalname) {
  const randomName = crypto.randomBytes(16).toString("hex");
  return randomName + path.extname(originalname);
}

function checkFileType(file, cb) {
  const allowedTypes = config.get('upload.allowedTypes');
  const extname = allowedTypes.some(type => 
    path.extname(file.originalname).toLowerCase() === type.split('/')[1]
  );
  const mimetype = allowedTypes.includes(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb("filetype");
}

// @route GET /image/:filename
// @desc Display specific image by filename
router.get("/image/:filename", async (req, res) => {
  try {
    const gfs = dbManager.getGridFS();
    if (!gfs) {
      return res.status(500).json({
        success: false,
        message: "GridFS not initialized",
        data: null,
      });
    }

    const files = await gfs.find({ filename: req.params.filename }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Image Available",
        data: null,
      });
    }
    const _id = files[0]._id;
    gfs.openDownloadStream(_id).pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
});

// @route DELETE /image/:filename
// @desc Delete file
router.delete("/image/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename || filename === "undefined") {
      return res.json({
        success: false,
        message: "Invalid Filename",
        data: null,
      });
    }

    const gfs = dbManager.getGridFS();
    if (!gfs) {
      return res.json({
        success: false,
        message: "GridFS not initialized",
        data: null,
      });
    }

    const files = await gfs.find({ filename: req.params.filename }).toArray();
    if (!files || files.length === 0) {
      return res.json({
        success: false,
        message: "Image not found",
        data: null,
      });
    }
    const _id = new mongoose.Types.ObjectId(files[0]._id);
    await gfs.delete(_id);

    return res.json({
      success: true,
      message: "Image Deleted Successfully",
      data: [],
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
      data: null,
    });
  }
});

// @route POST /upload
// @desc Upload File to DB
router.post(
  "/upload",
  (req, res, next) => {
    const upload = store.single("file");
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        return res.json({
          success: false,
          message: "File too large",
          data: null,
        });
      } else if (err) {
        if (err === "filetype")
          return res.json({
            success: false,
            message: "Image files only",
            data: null,
          });
        return res.json({ success: false, message: err, data: null });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const gfs = dbManager.getGridFS();
      if (!gfs) {
        return res.json({
          success: false,
          message: "GridFS not initialized",
          data: null,
        });
      }

      const { file } = req;
      if (!file) {
        return res.json({
          success: false,
          message: "No file uploaded",
          data: null,
        });
      }

      const filename = generateFilename(file.originalname);

      // Create readable stream from buffer
      const readableStream = Readable.from(file.buffer);

      // Upload to GridFS
      const uploadStream = gfs.openUploadStream(filename, {
        contentType: file.mimetype,
      });

      readableStream.pipe(uploadStream);

      uploadStream.on("error", (err) => {
        return res.json({
          success: false,
          message: "Upload failed: " + err.message,
          data: null,
        });
      });

      uploadStream.on("finish", () => {
        return res.json({
          success: true,
          message: "File Uploaded Successfully",
          data: {
            _id: uploadStream.id,
            filename: filename,
            originalname: file.originalname,
            size: file.size,
            contentType: file.mimetype,
          },
        });
      });
    } catch (error) {
      return res.json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
);

// @route GET /all
// @desc Get all files from DB
router.get("/all", async (req, res) => {
  try {
    const gfs = dbManager.getGridFS();
    if (!gfs) {
      return res.json({
        success: false,
        message: "GridFS not initialized",
        data: null,
      });
    }

    const files = await gfs.find().toArray();
    if (!files || files.length === 0) {
      return res.json({
        success: false,
        message: "No files exist",
        data: null,
      });
    } else {
      return res.json({
        success: true,
        message: "File Retrieved Successfully",
        data: files,
      });
    }
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
      data: null,
    });
  }
});

// @route GET /file/:id
// @desc Display specific file by _id
router.get("/file/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === "undefined") {
      return res.json({
        success: false,
        message: "Invalid File Id",
        data: null,
      });
    }

    const gfs = dbManager.getGridFS();
    if (!gfs) {
      return res.json({
        success: false,
        message: "GridFS not initialized",
        data: null,
      });
    }

    const _id = new mongoose.Types.ObjectId(id);
    const files = await gfs.find({ _id }).toArray();
    if (!files || files.length === 0) {
      return res.json({
        success: false,
        message: "No File Exists for Id",
        data: null,
      });
    }
    gfs.openDownloadStream(_id).pipe(res);
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
      data: null,
    });
  }
});

// @route DELETE /:id
// @desc Delete file
router.delete("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === "undefined") {
      return res.json({
        success: false,
        message: "Invalid File Id",
        data: null,
      });
    }

    const gfs = dbManager.getGridFS();
    if (!gfs) {
      return res.json({
        success: false,
        message: "GridFS not initialized",
        data: null,
      });
    }

    const _id = new mongoose.Types.ObjectId(id);
    await gfs.delete(_id);

    return res.json({
      success: true,
      message: "File Deleted Successfully",
      data: [],
    });
  } catch (err) {
    return res.json({
      success: false,
      message: err.message,
      data: null,
    });
  }
});

module.exports = router;
