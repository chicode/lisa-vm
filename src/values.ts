import * as ast from "./ast";
import { Scope } from "./index";

export type Value =
  | NoneValue
  | BoolValue
  | NumValue
  | StrValue
  | ListValue
  | RecordValue
  | FuncValue
  | CapsuleValue;

export interface NoneValue {
  readonly type: "none";
}

export interface BoolValue {
  readonly type: "bool";
  readonly value: boolean;
}

export interface NumValue {
  readonly type: "num";
  readonly value: number;
}

export interface StrValue {
  readonly type: "str";
  readonly value: string;
}

export interface ListValue {
  readonly type: "list";
  readonly value: readonly Value[];
}

export interface RecordValue {
  readonly type: "record";
  readonly value: { readonly [k: string]: Value };
}

export type LocatedValue = [Value, any];
export type NativeFunc = (loc: any, ...args: [Value, any][]) => Value;
export type FuncPayload =
  | {
      readonly type: "native";
      readonly func: NativeFunc;
    }
  | {
      readonly type: "lambda";
      readonly scope: Scope;
      readonly func: ast.FuncDecl;
    }
  | {
      readonly type: "fieldAccess";
      readonly fields: readonly string[];
    };

export interface FuncValue {
  readonly type: "func";
  readonly func: FuncPayload;
}

export interface CapsuleValue {
  readonly type: "capsule";
  readonly value: any;
}

export const none: NoneValue = Object.freeze({ type: "none" });

export const bool = (value: boolean): BoolValue =>
  Object.freeze({ type: "bool", value });

export const num = (value: number): NumValue =>
  Object.freeze({ type: "num", value });

export const str = (value: string): StrValue =>
  Object.freeze({ type: "str", value });

export const list = (value: Value[]): ListValue =>
  Object.freeze({ type: "list", value: Object.freeze(value) });

export const record = (value: { [k: string]: Value }): RecordValue =>
  Object.freeze({ type: "record", value: Object.freeze(value) });

const makeFunc = (func: FuncPayload): FuncValue =>
  Object.freeze({
    type: "func",
    func: Object.freeze(func),
  });

export const native = (func: NativeFunc): FuncValue =>
  makeFunc({
    type: "native",
    func,
  });

export const lisaFunc = (scope: Scope, func: ast.FuncDecl): FuncValue =>
  makeFunc({
    type: "lambda",
    scope,
    func,
  });

export const fieldAccess = (fields: string[]): FuncValue =>
  makeFunc({ type: "fieldAccess", fields: Object.freeze(fields) });

export const capsule = (value: any): CapsuleValue =>
  Object.freeze({ type: "capsule", value });
