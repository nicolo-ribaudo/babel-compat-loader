const { promisify } = require("util");
const fs = require("fs");
const cp = require("child_process");
const rimraf = require("rimraf");

exports.fs = {
  readFile: promisify(fs.readFile),
  writeFile: promisify(fs.writeFile),
  readdir: promisify(fs.readdir),
  mkdir: promisify(fs.mkdir)
};

exports.cp = {
  exec: promisify(cp.exec)
};

exports.rimraf = promisify(rimraf);
