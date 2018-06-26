import babylon from "@babel/parser";
import t from "@babel/types";

import { nonBabelCJS, esReexports, esExportNames } from "./meta.mjs";

function isExportsDotNameAssign(expr) {
  return (
    t.isAssignmentExpression(expr) &&
    t.isMemberExpression(expr.left) &&
    t.isIdentifier(expr.left.object, { name: "exports" }) &&
    t.isIdentifier(expr.left.property)
  );
}

function getCompiledExportMeta(node, url) {
  // var NAME = exports.NAME = 2; (babel 6 only)
  if (t.isVariableDeclaration(node) && node.declarations.length === 1) {
    const { init } = node.declarations[0];
    if (isExportsDotNameAssign(init)) {
      return { kind: "export", name: init.left.property.name };
    }
  }

  if (!t.isExpressionStatement(node)) return;
  const { expression: expr } = node;

  // exports.NAME = ?
  if (isExportsDotNameAssign(expr)) {
    const { name } = expr.left.property;
    if (name === "__esModule") return { kind: "__esModule" };

    return { kind: "export", name };
  }

  if (
    // Object.defineProperty(exports, "NAME", {
    //   get() { return MODULE_ID.ORIGINAL_NAME; }
    // })
    t.isCallExpression(expr) &&
    t.matchesPattern(expr.callee, "Object.defineProperty") &&
    expr.arguments.length === 3 &&
    t.isIdentifier(expr.arguments[0], { name: "exports" }) &&
    t.isStringLiteral(expr.arguments[1])
  ) {
    const name = expr.arguments[1].value;
    if (name === "__esModule") return { kind: "__esModule" };

    let getter = expr.arguments[2].properties.find(p =>
      t.isIdentifier(p.key, { name: "get" })
    );

    if (getter) {
      if (t.isObjectProperty(getter)) getter = getter.value;
      if (
        t.isFunction(getter) &&
        t.isReturnStatement(getter.body.body[0]) &&
        t.isMemberExpression(getter.body.body[0].argument)
      ) {
        const {
          object: { name: moduleId },
          property: { name: originalName }
        } = getter.body.body[0].argument;
        const { start, end } = node;

        console.warn(
          "[babel-compat-loader] Reexports are not fully supported." +
            " Live bindings will not be updated."
        );

        return { kind: "reexport", name, moduleId, originalName, start, end };
      }
    }
  }
}

export function analyze(content, url) {
  if (esExportNames.has(url)) return true;
  if (nonBabelCJS.has(url)) return false;

  if (content.indexOf("__esModule") === -1) {
    nonBabelCJS.add(url);
    return false;
  }

  const ast = babylon.parse(content, { sourceType: "module" });

  const exportNames = new Set();
  const reexportNames = new Set();
  let wasEsModule = false;

  for (const node of ast.program.body) {
    const meta = getCompiledExportMeta(node, url);

    if (meta) {
      const { kind, ...reexport } = meta;
      if (kind === "__esModule") wasEsModule = true;
      else exportNames.add(meta.name);
      if (kind === "reexport") reexportNames.add(reexport);
    }
  }

  if (!wasEsModule) {
    nonBabelCJS.add(url);
    return false;
  }

  esExportNames.set(url, exportNames);
  if (reexportNames.size > 0) esReexports.set(url, reexportNames);

  return true;
}
