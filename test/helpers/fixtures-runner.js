const path = require("path");
const {
  mapAsync,
  regG,
  canonicalyzeStderr,
  equals,
  replaceMjsExt,
  readFileCached
} = require("./utils.js");
const { fs, rimraf, cp } = require("./modules.js");

const compilers = require("./compilers.js");

async function compileFiles(fixture) {
  const { transform: toTransform } = fixture;
  const importsRE = regG`(?<=(?:from\s*|require\()["']\./)(${toTransform.join(
    "|"
  )})(?=["'])`;
  const transform = compilers[fixture.version];
  const outputDirPath = path.join(fixture.path, fixture.version);

  await fs.mkdir(outputDirPath);

  await mapAsync(fixture.fileNames, async fileName => {
    let content = await readFileCached(
      path.join(fixture.path, "src", fileName)
    );

    content = content.replace(importsRE, replaceMjsExt);

    if (toTransform.includes(fileName)) {
      content = transform(content);
      fileName = replaceMjsExt(fileName);
    }

    await fs.writeFile(path.join(outputDirPath, fileName), content);
  });
}

async function execFixture(pathname, loaderPath, useLoader) {
  let command = "node --experimental-modules ";
  if (useLoader) command += `--loader ${loaderPath} `;
  command += pathname;

  try {
    return { stdout: (await cp.exec(command)).stdout.trim() };
  } catch (error) {
    return { stderr: canonicalyzeStderr(error.stderr) };
  }
}

module.exports = async function runFixture(fixture, loaderPath) {
  const compiledFolder = path.join(fixture.path, fixture.version);
  const srcFolder = path.join(fixture.path, "src");

  test(`${fixture.name} - babel ${fixture.version}`, async () => {
    await rimraf(compiledFolder);
    await compileFiles(fixture);

    const actual = await execFixture(compiledFolder, loaderPath, true);

    if (fixture.type === "snapshot") {
      expect(actual.stdout).toMatchSnapshot("stdout");
      expect(actual.stderr).toMatchSnapshot("stderr");
    } else {
      const expected = await execFixture(srcFolder, loaderPath);
      expect(actual.stdout).toBe(expected.stdout);
      expect(actual.stderr).toBe(expected.stderr);
    }
  });
};
