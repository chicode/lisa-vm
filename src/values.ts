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
  type: "str";
  value: string;
}

export interface NumValue {
  type: "num";
  value: number;
}

export interface BoolValue {
  type: "bool";
  value: boolean;
}

export interface ListValue {
  type: "list";
  value: Value[];
}

export type LocatedValue = [Value, any];
export type NativeFunc = (loc: any, ...args: [Value, any][]) => Value;

export interface FuncValue {
  type: "func";
  func:
    | NativeFunc
    | {
        scope: Scope;
        func: ast.FuncDecl;
      };
}

export interface NoneValue {
  type: "none";
}

export const none = (): NoneValue => ({ type: "none" });

export const bool = (value: boolean): BoolValue => ({ type: "bool", value });

export const num = (value: number): NumValue => ({ type: "num", value });

export const str = (value: string): StrValue => ({ type: "str", value });

export const list = (value: Value[]): ListValue => ({ type: "list", value });

export const native = (func: NativeFunc): FuncValue => ({
  type: "func",
  func,
});
