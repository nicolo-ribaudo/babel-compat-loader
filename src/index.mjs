import Module from "module";
import path from "path";
import { URL } from "url";
import assert from "assert";

import { nonBabelCJS, esReexports, esExportNames } from "./meta.mjs";
import { analyze } from "./analyzer.mjs";
import { redefine, removeRange, readFile } from "./utils.mjs";

export async function resolve(specifier, parentURL, defaultResolver) {
  const { format, url } = defaultResolver(specifier, parentURL);

  if (format !== "cjs" || nonBabelCJS.has(url)) return { format, url };
  if (esExportNames.has(url)) return { format: "dynamic", url };

  const content = await readFile(new URL(url), "utf8");
  const wasEsModule = analyze(content, url);

  return {
    format: wasEsModule ? "dynamic" : format,
    url
  };
}

export async function dynamicInstantiate(url) {
  const exportsNames = esExportNames.get(url);
  assert(exportsNames);

  const filename = new URL(url).pathname;

  return {
    exports: Array.from(exportsNames),
    execute(exports) {
      let module = Module._cache[filename];
      const cached = !!module;
      const oldExports = cached && module.exports;

      if (!cached) {
        module = new Module(filename);
        Module._cache[filename] = module;
      }

      module.exports = createExportsProxy(exportsNames, exports);

      if (cached) {
        for (const name of exportsNames) {
          module.exports[name] = oldExports[name];
        }
      } else {
        // We can't use Module.load because it tries to export
        // `module.exports` as default.

        assert(!module.loaded);
        module.filename = filename;
        module.paths = Module._nodeModulePaths(path.dirname(filename));
        Module._extensions[".js"](module, filename);
        module.loaded = true;
      }
    }
  };
}

function createExportsProxy(exportsNames, exports) {
  return new Proxy(
    {},
    {
      set(target, key, value) {
        const result = Reflect.set(target, key, value);
        if (!result) return false;

        if (key === "__esModule") return true;

        assert(exportsNames.has(key));
        exports[key].set(value);

        return true;
      },
      defineProperty(target, key, value) {
        const result = Reflect.defineProperty(target, key, value);
        if (!result) return false;

        if (key === "__esModule") return true;

        assert(exportsNames.has(key));
        // It will be initialized by the code injected by Module#_compile.
        // exports[key].set(value.get());

        return true;
      }
    }
  );
}

redefine(
  Module.prototype,
  "_compile",
  _compile =>
    function(content, filename) {
      const url = new URL(filename, "file://").href;

      const wasEsModule = analyze(content, url);
      const reexports = wasEsModule && esReexports.get(url);

      if (reexports) {
        let initCode = "";
        // We handle reexports in reverse order because we need to manipulate the
        // source code. When we remove a statement, all the locations after that
        // don't match the original ast.
        for (const reexport of Array.from(reexports).reverse()) {
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
