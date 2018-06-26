import * as fs from "fs";
import { promisify } from "util";

export const readFile = promisify(fs.readFile);

export function redefine(object, name, getValue) {
  const oldValue = object[name];
  object[name] = getValue(oldValue);
}

export function removeRange(string, start, end) {
  return string.slice(0, start) + string.slice(end);
}
