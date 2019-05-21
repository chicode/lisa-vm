export type Value =
  | StrValue
  | NumValue
  | BoolValue
  | ListValue
  | JsFuncValue
  | NativeFuncValue
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

export type JsPrimitive = number | string | boolean | null | any[] | JsFunc;
export type JsFunc = (...args: JsPrimitive[]) => JsPrimitive;

export interface JsFuncValue {
  type: "jsFunc";
  func: JsFunc;
}

export type NativeFunc = (loc: any, ...args: [Value, any][]) => Value;

export interface NativeFuncValue {
  type: "nativeFunc";
  func: NativeFunc;
}

export interface NoneValue {
  type: "none";
}

export const none = (): NoneValue => ({ type: "none" });

export const bool = (value: boolean): BoolValue => ({ type: "bool", value });
