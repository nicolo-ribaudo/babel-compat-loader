const path = require("path");
const fs = require("fs");
const cp = require("child_process");
const { rimraf } = require("./modules.js");
const { mapAsync, canonicalyzeStderr } = require("./utils.js");

function loadOptions(fixturePath) {
  const optionsPath = path.join(fixturePath, "options.json");
  const content = fs.readFileSync(optionsPath, "utf8");
  return JSON.parse(content);
}

function loadFiles(fixturePath) {
  const names = fs.readdirSync(path.join(fixturePath, "src"));
  const files = names.map(name => {
    const filePath = path.join(fixturePath, "src", name);
    const content = fs.readFileSync(filePath, "utf8");
    return [name, content];
  });

  return new Map(files);
}

module.exports = function loadFixtures(basePath) {
  const names = fs.readdirSync(basePath);

  const fixtures = [];

  for (const name of names) {
    const fixturePath = path.join(basePath, name);
    const { transform, versions, type } = loadOptions(fixturePath);
    const files = loadFiles(fixturePath);
    const fileNames = fs.readdirSync(path.join(fixturePath, "src"));

    for (const version of versions) {
      fixtures.push({
        name,
        transform,
        type,
        fileNames,
        version: String(version),
        path: fixturePath
      });
    }
  }

  return fixtures;
};
