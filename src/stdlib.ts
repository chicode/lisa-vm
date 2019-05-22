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
  FuncValue,
  num,
} from "./values";
import { LisaError } from "./error";

const notnone = native(
  (loc, val?): BoolValue => {
    if (!val) throw new LisaError("Missing first arg to notnone", loc);
    return bool(val[0].type !== "none");
  },
);

const log = native(
  (_loc, ...args): NoneValue => {
    console.log(...args.map(arg => arg[0]));
    return none();
  },
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
      throw new LisaError("Expected at least 2 arguments to '='", loc);
    const comparator = args[0][0];
    return bool(args.slice(1).every(elem => equals(comparator, elem[0])));
  },
);

const genIsType = (type: Value["type"]): FuncValue =>
  native(
    (loc, ...args): BoolValue => {
      if (args.length < 1)
        throw new LisaError(`Expected at least 1 argument to '${type}?'`, loc);
      return bool(args.every(arg => arg[0].type === type));
    },
  );

const genCmp = (name: string, pred: (lhs: number, rhs: number) => boolean) =>
  native(
    (loc, ...args): BoolValue => {
      if (args.length < 2)
        throw new LisaError(`Expected at least 2 arguments to '${name}'`, loc);
      return bool(
        args.reduce((prev: [boolean, NumValue] | null, cur): [
          boolean,
          NumValue
        ] => {
          if (cur[0].type !== "num")
            throw new LisaError(`'${name}' only accepts numbers`, cur[1]);
          return prev
            ? [prev[0] && pred(prev[1].value, cur[0].value), cur[0]]
            : [true, cur[0]];
        }, null)![0],
      );
    },
  );

const genArithmetic = (
  name: string,
  pred: (lhs: number, rhs: number) => number,
) =>
  native(
    (loc, ...args): NumValue => {
      if (args.length < 2)
        throw new LisaError(`Expected at least 2 arguments to '${name}'`, loc);
      if (args[0][0].type !== "num")
        throw new LisaError(`'${name}' only accepts numbers`, args[0][1]);
      return num(
        args.slice(1).reduce((acc, cur) => {
          if (cur[0].type !== "num")
            throw new LisaError(`'${name}' only accepts numbers`, cur[1]);
          return pred(acc, cur[0].value);
        }, args[0][0].value),
      );
    },
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
  "none?": genIsType("none"),
  "<": genCmp("<", (a, b) => a < b),
  "<=": genCmp("<=", (a, b) => a <= b),
  ">": genCmp(">", (a, b) => a > b),
  ">=": genCmp(">=", (a, b) => a >= b),
  "+": genArithmetic("+", (a, b) => a + b),
  "-": genArithmetic("-", (a, b) => a - b),
  "*": genArithmetic("*", (a, b) => a * b),
  "/": genArithmetic("/", (a, b) => a / b),
};
