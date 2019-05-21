import {
  Value,
  bool,
  BoolValue,
  none,
  NoneValue,
  ListValue,
  StrValue,
  NumValue
} from "./values";
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

const log = native(
  (_loc, ...args): NoneValue => {
    console.log(...args.map(arg => arg[0]));
    return none();
  }
);

export function equals(lhs: Value, rhs: Value): boolean {
  if (lhs.type !== rhs.type) return false;
  switch (lhs.type) {
    case "none":
      return true;
    case "bool":
    case "str":
    case "num":
      return lhs.value === (rhs as BoolValue | StrValue | NumValue).value;
    case "list":
      const arrL = lhs.value;
      const arrR = (rhs as ListValue).value;
      return (
        arrL.length === arrR.length &&
        arrL.every((elem, i) => equals(elem, arrR[i]))
      );
  }
}

const eq = native(
  (loc, ...args): BoolValue => {
    if (args.length < 2)
      throw new LisaError("Expected 2 or more args to '='", loc);
    const comparator = args[0][0];
    return bool(args.slice(1).every(elem => equals(comparator, elem[0])));
  }
);

export const stdlib = {
  notnone,
  log,
  "=": eq
};
