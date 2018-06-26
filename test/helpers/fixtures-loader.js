const path = require("path");
const fs = require("fs");
const cp = require("child_process");

function loadOptions(fixturePath) {
  const optionsPath = path.join(fixturePath, "options.json");
  const content = fs.readFileSync(optionsPath, "utf8");
  return JSON.parse(content);
}

module.exports = function loadFixtures(basePath) {
  const names = fs.readdirSync(basePath);

  const fixtures = [];

  for (const name of names) {
    const fixturePath = path.join(basePath, name);
    const { transform, versions, type } = loadOptions(fixturePath);
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
