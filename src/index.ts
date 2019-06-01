import * as ast from "./ast";
import {
  Value,
  none,
  NativeFunc,
  FuncValue,
  list,
  num,
  str,
  lisaFunc,
  bool,
} from "./values";
import * as values from "./values";
import { LisaError } from "./error";
import { stdlib } from "./stdlib";
import { hasOwnProperty, fromEntries } from "./util";

export { values, LisaError, ast };

export class Scope {
  vars: { [k: string]: Value } = Object.create(null);

  constructor(public parent: Scope | null = null) {
    Object.freeze(this);
  }

  freezeVars() {
    Object.freeze(this.vars);
  }

  withVar(varname: string, value: Value): Scope {
    const scope = new Scope(this);
    scope.vars[varname] = value;
    scope.freezeVars();
    return scope;
  }

  getVar(varname: string): Value | null {
    for (let scope: Scope | null = this; scope; scope = scope.parent) {
      if (hasOwnProperty(scope.vars, varname)) {
        return scope.vars[varname];
      }
    }
    return null;
  }

  getFunction(name: string): JsFunc | null {
    const func = this.getVar(name);
    if (!func) return null;
    if (func.type !== "func") return null;
    return funcToJs(func);
  }
}

export function callFunction(
  { func }: FuncValue,
  loc: any,
  args: [Value, any][],
): Value {
  switch (func.type) {
    case "native":
      return func.func.apply(undefined, [loc, ...args]);
    case "fieldAccess":
      if (args.length !== 1)
        throw new LisaError("Field accessors take one value only", loc);
      const recordLoc = args[0][1];
      return func.fields.reduce((record, curField, i) => {
        const err = () =>
          func.fields.length
            ? func.fields
                .slice(0, i)
                .map(field => `.${field}`)
                .join("")
            : "This record";
        if (record.type !== "record")
          throw new LisaError(`Expected ${err()} to be a record`, recordLoc);
        if (!hasOwnProperty(record.value, curField))
          throw new LisaError(
            `${err()} does not have field '${curField}'`,
            recordLoc,
          );
        return record.value[curField];
      }, args[0][0]);
    case "lambda":
      const {
        scope,
        func: { body, params },
      } = func;

      if (args.length < params.length)
        throw new LisaError(`Too few args to function`, loc);
      if (args.length > params.length)
        throw new LisaError(`Too many args to function`, loc);

      const funcScope = new Scope(scope);
      params.forEach((paramName, i) => {
        funcScope.vars[paramName] = args[i][0];
      });
      funcScope.freezeVars();
      return evalExpression(funcScope, body);
  }
}

export type JsPrimitive =
  | number
  | string
  | boolean
  | null
  | object
  | any[]
  | JsFunc;
export type JsFunc = (...args: JsPrimitive[]) => JsPrimitive;

export const funcToJs = (func: FuncValue): JsFunc => (...args) =>
  valueToJs(
    callFunction(
      func,
      null,
      args.map(
        (arg, i): [Value, any] => {
          const val = jsToValue(arg);
          if (!val)
            throw new Error(
              `Arg ${i} passed to function '${name}' from JS cannot be ` +
                `transformed into a Lisa value`,
            );
          return [val, null];
        },
      ),
    ),
  );

export function evalExpression(scope: Scope, expr: ast.Expression): Value {
  switch (expr.type) {
    case "getSymbol":
      const val = scope.getVar(expr.symbol.name);
      if (!val)
        throw LisaError.fromNode(
          expr,
          `Symbol '${expr.symbol.name}' is not defined in this scope.`,
        );
      return val;
    case "funcCall":
      const func = evalExpression(scope, expr.func);
      if (func.type !== "func")
        throw new Error(`Attempted to call non-function`);
      return callFunction(
        func,
        expr.location,
        expr.args.map(
          (arg): [Value, any] => [evalExpression(scope, arg), arg.location],
        ),
      );
    case "cond":
      for (const clause of expr.clauses) {
        const cond = evalExpression(scope, clause.cond);
        if (cond.type !== "bool")
          throw LisaError.fromNode(
            clause.cond,
            "Expected condition to be a boolean value",
          );
        if (cond.value) return evalExpression(scope, clause.val);
      }
      return evalExpression(scope, expr.otherwise);
    case "func":
      return lisaFunc(scope, expr);
    case "let":
      const letScope = new Scope(scope);
      for (const def of expr.defs) {
        letScope.vars[def.name] = evalExpression(letScope, def.val);
      }
      letScope.freezeVars();
      return evalExpression(letScope, expr.body);
    case "recordLit":
      return values.record(
        fromEntries(
          Object.entries(expr.fields).map(([k, v]) => [
            k,
            evalExpression(scope, v),
          ]),
        ),
      );
    case "fieldAccess":
      return values.fieldAccess(expr.fieldNames);
    case "noneLit":
      return none;
    case "boolLit":
      return bool(expr.value);
    case "numLit":
      return num(expr.value);
    case "strLit":
      return str(expr.value);
    case "list":
      return list(expr.elements.map(elem => evalExpression(scope, elem)));
  }
}

export function initProgram(funcs: { [k: string]: NativeFunc } = {}): Scope {
  const topScope = new Scope();
  for (const [name, value] of Object.entries(stdlib)) {
    topScope.vars[name] = value;
  }
  for (const [name, func] of Object.entries(funcs)) {
    topScope.vars[name] = values.native(func);
  }
  const programScope = new Scope(topScope);
  return programScope;
}

export function valueToJs(value: Value): JsPrimitive {
  switch (value.type) {
    case "bool":
    case "str":
    case "num":
      return value.value;
    case "record":
      return fromEntries(
        Object.entries(value.value).map(([k, v]) => [k, valueToJs(v)]),
      );
    case "none":
      return null;
    case "list":
      return value.value.map(valueToJs);
    case "func":
      return funcToJs(value);
    case "capsule":
      return value.value;
  }
}

export function jsToValue(value: unknown): Value | null {
  if (value == null) return none;
  switch (typeof value) {
    case "number":
      return num(value);
    case "string":
      return str(value);
    case "boolean":
      return bool(value);
    default:
      if (Array.isArray(value)) {
        const list = value.map(jsToValue);
        if (list.some(elem => elem === null)) return null;
        return values.list(list as Value[]);
      }
      return null;
  }
}
