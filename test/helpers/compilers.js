const babel7core = require("@babel/core");
const babel6core = require("babel-core");
const babel7modules = require("@babel/plugin-transform-modules-commonjs");
const babel6modules = require("babel-plugin-transform-es2015-modules-commonjs");

module.exports = {
  "6": code => babel6core.transform(code, { plugins: [babel6modules] }).code,
  "7": code => babel7core.transform(code, { plugins: [babel7modules] }).code
};
