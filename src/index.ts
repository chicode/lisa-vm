import * as ast from "./ast";
import { Value, none } from "./values";
import { LisaError } from "./error";
import { stdlib, native, isNativeFunc } from "./stdlib";
import { hasOwnProperty } from "./util";

interface Var {
  type: "var" | "const" | "param";
  value: Value;
}

export class Scope {
  vars: { [k: string]: Var } = Object.create(null);
  funcs: { [k: string]: Function } = Object.create(null);

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

  getFunc(name: string): Function | null {
    return hasOwnProperty(this.funcs, name)
      ? this.funcs[name]
      : this.parent
      ? this.parent.getFunc(name)
      : null;
  }
  hasFunc(name: string): boolean {
    return (
      hasOwnProperty(this.funcs, name) ||
      (this.parent ? this.parent.hasFunc(name) : false)
    );
  }

  getFunction(name: string): Function | null {
    const func = this.getFunc(name);
    if (!func) return null;
    return isNativeFunc(func)
      ? (...args: any[]) =>
          func(
            null,
            ...args.map(
              (arg, i): [Value, any] => {
                const val = jsToValue(arg);
                if (!val)
                  throw new Error(
                    `Arg ${i} passed to function '${name}' from JS cannot be ` +
                      `transformed into a Lisa value`
                  );
                return [val, null];
              }
            )
          )
      : func;
  }
}

export function evalExpression(scope: Scope, expr: ast.Expression): Value {
  switch (expr.type) {
    case "strLit":
      return {
        type: "str",
        value: expr.value
      };
    case "numLit":
      return {
        type: "num",
        value: expr.value
      };
    case "if":
      const cond = evalExpression(scope, expr.cond);
      if (cond.type !== "bool")
        throw LisaError.fromNode(
          expr.cond,
          "If condition must be a bool value"
        );
      return expr.cond
        ? evalExpression(scope, expr.body)
        : expr.final
        ? evalExpression(scope, expr.final)
        : none();
    case "getVar":
      const val = scope.getVar(expr.var.name);
      if (val) return val.value;
      else
        throw LisaError.fromNode(
          expr,
          `Variable '${expr.var.name}' is not defined.`
        );
    case "setVar":
      const v = scope.getVar(expr.var.name);
      if (!v)
        throw LisaError.fromNode(
          expr.var,
          `Variable '${expr.var.name}' not declared before setting it`
        );
      if (v.type === "const")
        throw LisaError.fromNode(
          expr.var,
          `Constant '${expr.var.name}' cannot be set`
        );
      if (v.type === "param")
        throw LisaError.fromNode(
          expr.var,
          `You cannot change the value of param '${expr.var.name}'`
        );
      scope.setVar(expr.var.name, {
        type: "var",
        value: evalExpression(scope, expr)
      });
      return none();
    case "funcCall":
      const func = scope.getFunc(expr.func.name);
      if (!func)
        throw LisaError.fromNode(
          expr.func,
          `Function '${expr.func.name}' not available`
        );
      if (isNativeFunc(func)) {
        return func(
          expr.location,
          ...expr.args.map(
            (arg): [Value, any] => [evalExpression(scope, arg), arg.location]
          )
        );
      }
      const ret = func.apply(
        undefined,
        expr.args.map(arg => valueToJs(evalExpression(scope, arg)))
      );
      const retValue = jsToValue(ret);
      if (!retValue)
        throw new Error(
          `The return type of injected function '${
            expr.func.name
          }' cannot be transformed into a Lisa value`
        );
      return retValue;
  }
}

export function evalProgram(
  program: ast.Program,
  funcs: { [k: string]: Function } = {}
): Scope {
  const topScope = new Scope();
  Object.assign(topScope.funcs, stdlib, funcs);
  const programScope = new Scope(topScope);
  for (const [name, { params, body }] of Object.entries(program.funcs)) {
    programScope.funcs[name] = native((loc, ...args) => {
      const funcScope = new Scope(programScope);
      if (params.length < args.length)
        throw new LisaError(`Too few args to '${name}'`, loc);
      if (params.length > args.length)
        throw new LisaError(`Too many args to '${name}'`, loc);
      params.forEach((paramName, i) => {
        funcScope.vars[paramName] = {
          type: "param",
          value: args[i][0]
        };
      });
      return body.reduce((_, expr) => evalExpression(funcScope, expr), none());
    });
  }
  for (const [name, varDecl] of Object.entries(program.vars)) {
    programScope.vars[name] = {
      type: varDecl.type,
      value: evalExpression(programScope, varDecl.init)
    };
  }
  return programScope;
}

function valueToJs(value: Value): any {
  switch (value.type) {
    case "bool":
    case "str":
    case "num":
      return value.value;
    case "none":
      return null;
    case "list":
      return value.value.map(valueToJs);
  }
}

function jsToValue(value: unknown): Value | null {
  if (value == null) return none();
  switch (typeof value) {
    case "number":
      return {
        type: "num",
        value
      };
    case "string":
      return {
        type: "str",
        value
      };
    default:
      if (Array.isArray(value)) {
        const list = value.map(jsToValue);
        if (list.some(elem => elem === null)) return null;
        return {
          type: "list",
          value: list as Value[]
        };
      }
      return null;
  }
}
