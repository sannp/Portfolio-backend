const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv/config");

// Initialize
const app = express();
const port = process.env.PORT;
app.use(bodyParser.json());
app.use(cors());

// Connect to DB
mongoose.connect(process.env.DB_CONNECTION, () => {
	console.log("Connected to DB");
});
// Import Data Routes
const projectsRoutes = require("./routes/projects");
const categoryRoutes = require("./routes/categories");
const listcategoryRoutes = require("./routes/listcategories");
app.use("/projects", projectsRoutes);
app.use("/categories", categoryRoutes);
app.use("/listcategories", listcategoryRoutes);
// Import Files Routes
const filesRoutes = require("./routes/files");
app.use("/files", filesRoutes);
// Documentation
app.use("/", (req, res) => {
	res.send("<h1>Welcome to Portfolio Backend</h1>");
});
// Listening server
app.listen(port, () => {
	`Server running on ${port}`;
});
