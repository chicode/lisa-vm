import { Value, bool, BoolValue, none } from "./values";
import { LisaError } from "./error";
import { LocatedNode } from "./ast";

type NativeFunction = (loc: LocatedNode, ...args: LocatedValue[]) => Value;

export function native(func: NativeFunction) {
  Object.defineProperty(func, "__nativelisa", {});
  return func;
}

type LocatedValue = [Value, LocatedNode];

const notnone = native(
  (loc, val?): BoolValue => {
    if (!val) throw new LisaError("Missing first arg to notnone", loc);
    return bool(val[0].type !== "none");
  }
);

const log = native((loc, ...args) => {
  console.log(...args.map(arg => arg[0]));
  return none();
});

export const stdlib = {
  notnone,
  log
};
