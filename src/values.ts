export type Value = StrValue | NumValue | BoolValue | ListValue | NoneValue;

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

export interface NoneValue {
  type: "none";
}

export const none = (): NoneValue => ({ type: "none" });

export const bool = (value: boolean): BoolValue => ({ type: "bool", value });
