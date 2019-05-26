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
} from "./values";
import * as values from "./values";
import { LisaError } from "./error";
import { stdlib } from "./stdlib";
import { hasOwnProperty } from "./util";

export { values, LisaError, ast };

export interface Var {
  type: "var" | "const" | "param" | "definedFunc" | "builtinFunc";
  value: Value;
}

export class Scope {
  vars: { [k: string]: Var } = Object.create(null);

  constructor(public parent: Scope | null = null) {}

  getVar(varname: string): Var | null {
    return hasOwnProperty(this.vars, varname)
      ? this.vars[varname]
      : this.parent
      ? this.parent.getVar(varname)
      : null;
  }
  setVar(varname: string, value: Var) {
    if (hasOwnProperty(this.vars, varname)) {
      this.vars[varname] = value;
    } else if (this.parent) {
      this.parent.setVar(varname, value);
    } else {
      // normal error b/c calling code should check that hasVar() first
      // and then call this
      throw new Error("Variable not declared in scope list");
    }
  }

  getFunction(name: string): JsFunc | null {
    const v = this.getVar(name);
    if (!v) return null;
    const func = v.value;
    if (func.type !== "func") return null;
    return funcToJs(func);
  }

  injectFunc(name: string, func: NativeFunc) {
    this.vars[name] = {
      type: "builtinFunc",
      value: values.native(func),
    };
  }
}

export function callFunction(
  func: FuncValue,
  loc: any,
  args: [Value, any][],
): Value {
  if (typeof func.func === "function") {
    return func.func.apply(undefined, [loc, ...args]);
  }
  const {
    scope,
    func: { body, params },
  } = func.func;
  if (args.length < params.length)
    throw new LisaError(`Too few args to '${name}'`, loc);
  if (args.length > params.length)
    throw new LisaError(`Too many args to '${name}'`, loc);
  const funcScope = new Scope(scope);
  params.forEach((paramName, i) => {
    funcScope.vars[paramName] = {
      type: "param",
      value: args[i][0],
    };
  });
  return evalExpressions(funcScope, body);
}

export type JsPrimitive = number | string | boolean | null | any[] | JsFunc;
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
    case "strLit":
      return str(expr.value);
    case "numLit":
      return num(expr.value);
    case "if":
      const cond = evalExpression(scope, expr.cond);
      if (cond.type !== "bool")
        throw LisaError.fromNode(
          expr.cond,
          "If condition must be a bool value",
        );
      return cond.value
        ? evalExpression(scope, expr.body)
        : expr.final
        ? evalExpression(scope, expr.final)
        : none;
    case "do":
      const doScope = new Scope(scope);
      return evalExpressions(doScope, expr.body);
    case "list":
      return list(expr.elements.map(elem => evalExpression(scope, elem)));
    case "getVar":
      const val = scope.getVar(expr.var.name);
      if (val) return val.value;
      else
        throw LisaError.fromNode(
          expr,
          `Variable '${expr.var.name}' is not defined.`,
        );
    case "setVar":
      const v = scope.getVar(expr.var.name);
      if (!v)
        throw LisaError.fromNode(
          expr.var,
          `Variable '${expr.var.name}' not declared before setting it`,
        );
      if (v.type === "const")
        throw LisaError.fromNode(
          expr.var,
          `Constant '${expr.var.name}' cannot be set`,
        );
      if (v.type === "param")
        throw LisaError.fromNode(
          expr.var,
          `You cannot change the value of param '${expr.var.name}'`,
        );
      if (v.type === "definedFunc")
        throw LisaError.fromNode(
          expr.var,
          `You cannot change the value of function '${expr.var.name}`,
        );
      if (v.type === "builtinFunc")
        throw LisaError.fromNode(
          expr.var,
          `You cannot set the value of builtin function '${expr.var.name}'`,
        );
      scope.setVar(expr.var.name, {
        type: "var",
        value: evalExpression(scope, expr.val),
      });
      return none;
    case "funcCall":
      const funcVar = scope.getVar(expr.func.name);
      if (!funcVar)
        throw LisaError.fromNode(
          expr.func,
          `Function '${expr.func.name}' not available`,
        );
      if (funcVar.value.type !== "func")
        throw new Error(`Attempted to call non-function '${expr.func.name}'`);
      return callFunction(
        funcVar.value,
        expr.location,
        expr.args.map(
          (arg): [Value, any] => [evalExpression(scope, arg), arg.location],
        ),
      );
    case "func":
      return lisaFunc(scope, expr.func);
    case "defFunc":
      if (hasOwnProperty(scope.vars, expr.name.name))
        throw LisaError.fromNode(
          expr,
          `Cannot redefine previously defined function '${expr.name.name}'`,
        );
      scope.vars[expr.name.name] = {
        type: "definedFunc",
        value: lisaFunc(scope, expr.func),
      };
      return none;
    case "defVar":
      scope.vars[expr.var.name] = {
        type: expr.varType,
        value: expr.init ? evalExpression(scope, expr.init) : none,
      };
      return none;
    case "while":
      let prevVal: Value = none;
      while (true) {
        const cond = evalExpression(scope, expr.cond);
        if (cond.type !== "bool")
          throw LisaError.fromNode(
            expr.cond,
            "Condition to 'while' must be a boolean",
          );
        if (!cond.value) return prevVal;
        prevVal = evalExpressions(scope, expr.body);
      }
  }
}

export function initProgram(funcs: { [k: string]: NativeFunc } = {}): Scope {
  const topScope = new Scope();
  for (const [name, value] of Object.entries(stdlib)) {
    topScope.vars[name] = {
      type: "builtinFunc",
      value,
    };
  }
  for (const [name, func] of Object.entries(funcs)) {
    topScope.injectFunc(name, func);
  }
  const programScope = new Scope(topScope);
  return programScope;
}

export const evalExpressions = (scope: Scope, exprs: ast.Expression[]): Value =>
  exprs.reduce((_, expr) => evalExpression(scope, expr), none);

export function valueToJs(value: Value): JsPrimitive {
  switch (value.type) {
    case "bool":
    case "str":
    case "num":
      return value.value;
    case "none":
      return null;
    case "list":
      return value.value.map(valueToJs);
    case "func":
      return funcToJs(value);
  }
}

export function jsToValue(value: unknown): Value | null {
  if (value == null) return none;
  switch (typeof value) {
    case "number":
      return num(value);
    case "string":
      return str(value);
    default:
      if (Array.isArray(value)) {
        const list = value.map(jsToValue);
        if (list.some(elem => elem === null)) return null;
        return values.list(list as Value[]);
      }
      return null;
  }
}
