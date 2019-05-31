export interface LocatedNode {
  location: any;
}

export interface FuncDecl {
  params: string[];
  body: Expression;
}

export interface Symbol extends LocatedNode {
  name: string;
}

export type Expression =
  | GetSymbolExpression
  | FuncCallExpression
  | CondExpression
  | FuncExpression
  | LetExpression
  | RecordLitExpression
  | FieldAccessExpression
  | NoneLitExpression
  | BoolLitExpression
  | NumLitExpression
  | StrLitExpression
  | ListExpression;

export interface GetSymbolExpression extends LocatedNode {
  type: "getSymbol";
  symbol: Symbol;
}

export interface FuncCallExpression extends LocatedNode {
  type: "funcCall";
  func: Expression;
  args: Expression[];
}

export interface CondExpression extends LocatedNode {
  type: "cond";
  clauses: { cond: Expression; val: Expression }[];
  otherwise: Expression;
}

export interface FuncExpression extends FuncDecl, LocatedNode {
  type: "func";
}

export interface LetExpression extends LocatedNode {
  type: "let";
  defs: { name: string; val: Expression }[];
  body: Expression;
}

export interface RecordLitExpression extends LocatedNode {
  type: "recordLit";
  fields: { [k: string]: Expression };
}

export interface FieldAccessExpression extends LocatedNode {
  type: "fieldAccess";
  fieldNames: string[];
}

export interface NoneLitExpression extends LocatedNode {
  type: "noneLit";
}

export interface BoolLitExpression extends LocatedNode {
  type: "boolLit";
  value: boolean;
}

export interface NumLitExpression extends LocatedNode {
  type: "numLit";
  value: number;
}

export interface StrLitExpression extends LocatedNode {
  type: "strLit";
  value: string;
}

export interface ListExpression extends LocatedNode {
  type: "list";
  elements: Expression[];
}
