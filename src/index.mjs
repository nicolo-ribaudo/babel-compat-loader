import Module from "module";
import path from "path";
import { URL } from "url";
import assert from "assert";

import { analyze } from "./analyzer.mjs";
import { redefine, removeRange, readFile } from "./utils.mjs";

export async function resolve(specifier, parentURL, defaultResolver) {
  const { format, url } = defaultResolver(specifier, parentURL);

  return {
    url,
    format: format === "cjs" ? "dynamic" : format
  };
}

export async function dynamicInstantiate(url) {
  const filename = new URL(url).pathname;

  const content = await readFile(filename, "utf8");
  const { wasEsModule, exportNames } = analyze(content, url);

  if (!wasEsModule) {
    return {
      exports: ["default"],
      execute(exports) {
        let module = Module._cache[filename];

        if (!module) {
          module = new Module(filename);
          tryModuleLoad(module, filename);
        }

        exports.default.set(module.exports);
      }
    };
  }

  assert(exportNames);

  return {
    exports: Array.from(exportNames),
    execute(exports) {
      let module = Module._cache[filename];
      const cached = !!module;

      if (!cached) module = new Module(filename);

      defineExoprtsAccessors(exportNames, exports, module.exports);

      if (!cached) module.load(filename);
    }
  };
}

function tryModuleLoad(module, filename) {
  let threw = true;
  try {
    Module._cache[filename] = module;
    module.load(filename);
    threw = false;
  } finally {
    if (threw) delete Module._cache[filename];
  }
}

function defineExoprtsAccessors(exportsNames, exports, moduleExports) {
  for (const name of exportsNames) {
    exports[name].set(moduleExports[name]);
    Object.defineProperty(moduleExports, name, {
      enumerable: true,
      configurable: true,
      get: exports[name].get,
      set: exports[name].set
    });
  }
}

redefine(
  Module.prototype,
  "_compile",
  _compile =>
    function(content, filename) {
      const url = new URL(filename, "file://").href;

      const { wasEsModule, reexportNames } = analyze(content, url);

      if (!wasEsModule) return _compile.call(this, content, filename);

      if (reexportNames.size) {
        let initCode = "";
        // We handle reexports in reverse order because we need to manipulate the
        // source code. When we remove a statement, all the locations after that
        // don't match the original ast.
        for (const reexport of Array.from(reexportNames).reverse()) {
          const { moduleId, originalName, name, start, end } = reexport;
          initCode += `exports.${name} = ${moduleId}.${originalName};`;

          // TODO: Live bindings
          //
          // initCode += `
          //   let $${name} = exports.${name} = ${moduleId}.${originalName};
          //   Object.defineProperty(${moduleId}, "${originalName}", {
          //     get: () => $${name},
          //     set: value => {
          //       debugger; $${name} = exports.${name} = value
          //     },
          //   });
          // `;

          content = removeRange(content, start, end);
        }
        if (initCode) content += `\n;(() => { ${initCode} })()`;
      }

      return _compile.call(this, content, filename);
    }
);

// We need to overwrite this method to rpevent it from adding every cjs
// file to the ESModules registry.
redefine(
  Module.prototype,
  "load",
  load =>
    function(filename) {
      assert(!this.loaded);
      this.filename = filename;
      this.paths = Module._nodeModulePaths(path.dirname(filename));

      var extension = path.extname(filename) || ".js";
      if (!Module._extensions[extension]) extension = ".js";
      Module._extensions[extension](this, filename);
      this.loaded = true;
    }
);
