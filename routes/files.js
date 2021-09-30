const mongoose = require("mongoose");
const { GridFsStorage } = require("multer-gridfs-storage");
const router = require("express").Router();
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();

const conn = mongoose.createConnection(
	process.env.DB_CONNECTION,
	{
		useNewUrlParser: true,
		useUnifiedTopology: true,
	},
	() => {
		console.log("Connected to Files DB");
	}
);

let gfs;
conn.once("open", () => {
	gfs = new mongoose.mongo.GridFSBucket(conn.db, {
		bucketName: "uploads",
	});
});

const storage = new GridFsStorage({
	url: process.env.DB_CONNECTION,
	file: (req, file) => {
		return new Promise((resolve, reject) => {
			crypto.randomBytes(16, (err, buf) => {
				if (err) {
					return reject(err);
				}
				const filename =
					buf.toString("hex") + path.extname(file.originalname);
				const fileInfo = {
					filename: filename,
					bucketName: "uploads",
				};
				resolve(fileInfo);
			});
		});
	},
});

const store = multer({
	storage,
	limits: { fileSize: 20000000 },
	fileFilter: function (req, file, cb) {
		checkFileType(file, cb);
	},
});

function checkFileType(file, cb) {
	const filetypes = /jpeg|jpg|png|gif/;
	const extname = filetypes.test(
		path.extname(file.originalname).toLowerCase()
	);
	const mimetype = filetypes.test(file.mimetype);
	if (mimetype && extname) return cb(null, true);
	cb("filetype");
}

// @route GET /image/:filename
// @desc Display specific image by filename
router.get("/image/:filename", (req, res) => {
	gfs.find({ filename: req.params.filename }).toArray((err, files) => {
		if (!files || files.length === 0) {
			return res.status(404).json({
				success: false,
				message: "No Image Available",
				data: null,
			});
		}
		const _id = files[0]._id;
		gfs.openDownloadStream(_id).pipe(res);
	});
});

// @route DELETE /files/image/:filename
// @desc  Delete file
router.delete("/image/:filename", (req, res) => {
	const filename = req.params.filename;
	if (!filename || filename === "undefined")
		return res.json({
			success: false,
			message: "Invalid Filename",
			data: null,
		});
	gfs.find({ filename: req.params.filename }).toArray((err, files) => {
		if (!files || files.length === 0) {
			return res.json({
				success: false,
				message: "Image not found",
				data: null,
			});
		}
		const _id = new mongoose.Types.ObjectId(files[0]._id);
		gfs.delete(_id, (err) => {
			if (err)
				return res.json({
					success: false,
					message: err,
					data: null,
				});
			else
				return res.json({
					success: true,
					message: "Image Deleted Successfully",
					data: [],
				});
		});
	});
});

// @route POST / upload
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
		const { file } = req;
		return res.json({
			success: true,
			message: "File Uploaded Successfully",
			data: file,
		});
	}
);

// @route GET / all
// @desc Get all files from DB
router.get("/all", (req, res) => {
	gfs.find().toArray((err, files) => {
		if (!files || files.length === 0)
			return res.json({
				success: false,
				message: "No files exist",
				data: null,
			});
		else
			return res.json({
				success: true,
				message: "File Retrieved Successfully",
				data: files,
			});
	});
});

// @route GET /file/:id
// @desc Display specific file by _id
router.get("/file/:id", ({ params: { id } }, res) => {
	if (!id || id === "undefined")
		return res.json({
			success: false,
			message: "Invalid File Id",
			data: null,
		});
	const _id = new mongoose.Types.ObjectId(id);
	gfs.find({ _id }).toArray((err, files) => {
		if (!files || files.length === 0)
			return res.json({
				success: false,
				message: "No File Exists for Id",
				data: null,
			});
		gfs.openDownloadStream(_id).pipe(res);
	});
});

// @route DELETE /files/:id
// @desc  Delete file
router.delete("/:id", (req, res) => {
	const id = req.params.id;
	if (!id || id === "undefined")
		return res.json({
			success: false,
			message: "Invalid File Id",
			data: null,
		});
	const _id = new mongoose.Types.ObjectId(id);
	gfs.delete(_id, (err) => {
		if (err)
			return res.json({
				success: false,
				message: err,
				data: null,
			});
		else
			return res.json({
				success: true,
				message: "File Deleted Successfully",
				data: files,
			});
	});
});

module.exports = router;
