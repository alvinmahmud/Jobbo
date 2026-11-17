const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cache = new Map();

module.exports = function loadTypeScript(file) {
  const filename = path.resolve(__dirname, "..", file);
  if (cache.has(filename)) return cache.get(filename);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const result = {};
  cache.set(filename, result);
  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      return loadTypeScript(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), specifier)) + ".ts");
    }
    return require(specifier);
  };
  new Function("exports", "require", compiled)(result, localRequire);
  return result;
};
