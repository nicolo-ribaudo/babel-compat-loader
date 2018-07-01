# babel-compat-loader

> A node loader to `import` modules compiled by Babel as if they were native ESM.

## Installation

```sh
npm install --save babel-compat-loader
```

or

```sh
yarn add babel-compat-loader
```

## Usage

```sh
node --experimental-modules --loader babel-compat-loader ./your-file.mjs
```

## What is this loader needed for?


ECMAScript modules transpiled by Babel have a "problem": they are not ECMAScript modules anymore. They become CommonJS modules, but this creates an interoperability problem with ECMAScript modules in NodeJS.

Consider this exaple:

```js
// index.mjs
import { val } from "./dependency";
console.log(val);

// dependency.mjs
export const val = 3;
```

When this program is run using `node --experimental-modules index.mjs` it logs `3`, as expected.

When both the files are transpiled by Babel it still logs `3`, because Babel knows how to handle named exports defined in transpiled modules:
```js
// index.js
var _dependency = require("./dependency");

console.log(_dependency.val);

// dependency.js
Object.defineProperty(exports, "__esModule", { value: true });

var val = exports.val = 2;
```

When only the dependency is transpiled by Babel the program breaks:

```js
// index.mjs
import { val } from "./dependency";
console.log(val);

// dependency.mjs
Object.defineProperty(exports, "__esModule", { value: true });

var val = exports.val = 2;
```
```
import { val } from "./dependency";
         ^^^
SyntaxError: The requested module './dependency' does not provide an export named 'val'
    at ModuleJob._instantiate (internal/modules/esm/module_job.js:80:21)
```

The problem is that, since JavaScript engines need to know which variables are exported by a module _before_ executing it, CommonJS modules [only export a default value](https://nodejs.org/api/esm.html#esm_interop_with_existing_modules) which represents the `module.exports` object.

This loader fixes this problem, by analyzing the imported CommonJS modules before executing them.
