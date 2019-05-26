import * as ast from "./ast";
import { Scope } from "./index";

export type Value =
  | StrValue
  | NumValue
  | BoolValue
  | ListValue
  | FuncValue
  | NoneValue;

export interface StrValue {
  readonly type: "str";
  readonly value: string;
}

export interface NumValue {
  readonly type: "num";
  readonly value: number;
}

export interface BoolValue {
  readonly type: "bool";
  readonly value: boolean;
}

export interface ListValue {
  readonly type: "list";
  readonly value: Value[];
}

export type LocatedValue = [Value, any];
export type NativeFunc = (loc: any, ...args: [Value, any][]) => Value;

export interface FuncValue {
  readonly type: "func";
  readonly func:
    | NativeFunc
    | {
        readonly scope: Scope;
        readonly func: ast.FuncDecl;
      };
}

export interface NoneValue {
  readonly type: "none";
}

export const none: NoneValue = Object.freeze({ type: "none" });

export const bool = (value: boolean): BoolValue =>
  Object.freeze({ type: "bool", value });

export const num = (value: number): NumValue =>
  Object.freeze({ type: "num", value });

export const str = (value: string): StrValue =>
  Object.freeze({ type: "str", value });

export const list = (value: Value[]): ListValue =>
  Object.freeze({ type: "list", value });

export const native = (func: NativeFunc): FuncValue =>
  Object.freeze({
    type: "func",
    func,
  });

export const lisaFunc = (scope: Scope, func: ast.FuncDecl): FuncValue =>
  Object.freeze({ type: "func", func: Object.freeze({ scope, func }) });
