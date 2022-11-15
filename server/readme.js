const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const readmeFilepath = path.join(__dirname, "../README.md");
const readmeContent = fs.readFileSync(readmeFilepath, "utf8");

exports.readme = marked.parse(readmeContent);
exports.handler = () => exports.readme;
