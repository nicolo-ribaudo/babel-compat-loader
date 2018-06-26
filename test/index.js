const path = require("path");
const loadFixtures = require("./helpers/fixtures-loader.js");
const runFixture = require("./helpers/fixtures-runner.js");

const loaderPath = path.resolve(__dirname, "../src/index.mjs");

const fixtures = loadFixtures(path.resolve(__dirname, "./fixtures"));

fixtures.forEach(fixtures => runFixture(fixtures, loaderPath));
