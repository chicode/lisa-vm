import {
  Value,
  bool,
  BoolValue,
  none,
  NoneValue,
  ListValue,
  StrValue,
  NumValue,
  native,
  FuncValue,
  num,
  LocatedValue,
  list,
  str,
  RecordValue,
} from "./values";
import { LisaError } from "./error";
import { hasOwnProperty } from "./util";
import { callFunction } from "./index";

const log = native(
  (_loc, ...args): NoneValue => {
    console.log(...args.map(arg => arg[0]));
    return none;
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
    case "record":
      const rhRecord = (rhs as RecordValue).value;
      if (Object.keys(rhRecord).some(k => !hasOwnProperty(lhs.value, k)))
        return false;
      for (const k of Object.keys(lhs.value)) {
        if (!hasOwnProperty(rhRecord, k) || !equals(rhRecord[k], lhs.value[k]))
          return false;
      }
      return true;
    case "capsule":
      return false;
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

const genLogical = (
  name: string,
  init: boolean,
  op: (lhs: boolean, rhs: boolean) => boolean,
) =>
  native(
    (loc, ...args): BoolValue => {
      if (args.length < 2)
        throw new LisaError(`Expected at least 2 arguments to '${name}'`, loc);
      return bool(
        args.reduce((acc, cur) => {
          if (cur[0].type !== "bool")
            throw new LisaError(`'${name}' only accepts booleans`, cur[1]);
          return op(acc, cur[0].value);
        }, init),
      );
    },
  );

const len = native((loc, ...args) => {
  if (args.length < 1)
    throw new LisaError("'len' requires at least one argument", loc);
  return num(
    args.reduce((acc, cur) => {
      switch (cur[0].type) {
        case "list":
        case "str":
          return acc + cur[0].value.length;
        default:
          throw new LisaError("'len' only accepts lists and strs", cur[1]);
      }
    }, 0),
  );
});

const genListMethod = (
  name: string,
  func: (
    arr: readonly Value[],
    pred: (...args: LocatedValue[]) => LocatedValue,
  ) => Value[],
) =>
  native(
    (loc, ...args): ListValue => {
      if (args.length !== 2)
        throw new LisaError(
          `'${name}' takes exactly 2 arguments, a function and a list.`,
          loc,
        );
      const [mapper, target] = args;
      if (mapper[0].type !== "func")
        throw new LisaError(
          "'func' argument to 'map' must be a function.",
          mapper[1],
        );
      if (target[0].type !== "list")
        throw new LisaError(
          "'target' argument to 'map' must be a list.",
          target[1],
        );
      return list(
        func(target[0].value, (...args) => [
          callFunction(mapper[0] as FuncValue, loc, args),
          mapper[1],
        ]),
      );
    },
  );

const append = native(
  (loc, ...args): ListValue => {
    if (args.length < 2)
      throw new LisaError("'append' takes at least 2 arguments", loc);
    const [original, ...appendees] = args;
    if (original[0].type !== "list")
      throw new LisaError(
        "'original' argument to 'append' should be a list",
        original[1],
      );
    return list(original[0].value.concat(appendees.map(a => a[0])));
  },
);

const get = native(
  (loc, ...args): Value => {
    if (args.length !== 2)
      throw new LisaError("'get' takes exactly 2 arguments", loc);
    const [idx, list] = args;
    if (idx[0].type !== "num")
      throw new LisaError(
        "'idx' argument to 'get' should be a number",
        list[1],
      );
    if (list[0].type !== "list")
      throw new LisaError("'list' argument to 'get' should be a list", list[1]);
    if (!hasOwnProperty(list[0].value, idx[0].value))
      throw new LisaError(
        "This index is too big, it's more than length of the list",
        idx[1],
      );
    return list[0].value[idx[0].value];
  },
);

export const stdlib = {
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
  and: genLogical("and", true, (a, b) => a && b),
  or: genLogical("or", false, (a, b) => a || b),
  len,
  map: genListMethod("map", (list, pred) =>
    list.map(elem => pred([elem, null])[0]),
  ),
  filter: genListMethod("filter", (list, pred) =>
    list.filter(elem => {
      const doFilter = pred([elem, null]);
      if (doFilter[0].type !== "bool")
        throw new LisaError(
          "filtering function must return a boolean",
          doFilter[1],
        );
      return doFilter[0].value;
    }),
  ),
  mapIndex: genListMethod("map", (list, pred) =>
    list.map((elem, i) => pred([elem, null], [num(i), null])[0]),
  ),
  filterIndex: genListMethod("filter", (list, pred) =>
    list.filter((elem, i) => {
      const doFilter = pred([elem, null], [num(i), null]);
      if (doFilter[0].type !== "bool")
        throw new LisaError(
          "filtering function must return a boolean",
          doFilter[1],
        );
      return doFilter[0].value;
    }),
  ),
  append,
  get,
};
