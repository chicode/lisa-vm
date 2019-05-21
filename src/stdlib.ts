import {
  Value,
  bool,
  BoolValue,
  none,
  NoneValue,
  ListValue,
  StrValue,
  NumValue,
  NativeFunc,
  native,
  FuncValue
} from "./values";
import { LisaError } from "./error";
import { hasOwnProperty } from "./util";

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
    case "func":
      return lhs === rhs;
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

const genIsType = (type: Value["type"]): FuncValue =>
  native(
    (loc, ...args): BoolValue => {
      if (args.length < 1)
        throw new LisaError(`Expected at least 1 argument to '${type}?'`, loc);
      return bool(args.every(arg => arg[0].type === type));
    }
  );

export const stdlib = {
  notnone,
  log,
  "=": eq,
  "str?": genIsType("str"),
  "num?": genIsType("num"),
  "bool?": genIsType("bool"),
  "func?": genIsType("func"),
  "list?": genIsType("list"),
  "none?": genIsType("none")
};
