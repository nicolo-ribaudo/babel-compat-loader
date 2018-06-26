const { fs } = require("./modules.js");

exports.mapAsync = (arr, fn) => Promise.all(arr.map(fn));
exports.regG = (...args) => new RegExp(String.raw(...args), "g");

exports.replaceMjsExt = fileName => fileName.replace(/\.mjs$/, ".js");

exports.maybeTrim = obj => (typeof obj === "string" ? obj.trim() : obj);

exports.canonicalyzeStderr = function(stderr) {
  return stderr
    .replace(/^\(node:\d+\) ExperimentalWarning:.*?$/gm, "")
    .replace(/^\[babel-compat-loader\].*?$/gm, "")
    .replace(/file:\/\/\/([^\/ ]+\/)*/g, "[ROOT]/")
    .replace(/\.js/g, ".mjs")
    .trim();
};

const filesCache = new Map();
exports.readFileCached = async function(path) {
  const cached = filesCache.get(path);
  if (cached) return cached;

  const content = await fs.readFile(path, "utf8");
  filesCache.set(path, content);
  return content;
};
