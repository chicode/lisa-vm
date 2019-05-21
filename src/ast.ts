export interface LocatedNode {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface Program {
  vars: {
    [k: string]: {
      type: VarDecl;
      init: Expression;
    };
  };
  funcs: { [k: string]: FuncDecl };
}

export type VarDecl = "var" | "const";

export interface FuncDecl {
  params: string[];
  body: Expression[];
}

export interface Symbol extends LocatedNode {
  name: string;
}

export type Expression =
  | SetVarExpression
  | GetVarExpression
  | FuncCallExpression
  | IfExpression
  | StrLitExpression
  | NumLitExpression;

export interface SetVarExpression extends LocatedNode {
  type: "setVar";
  var: Symbol;
  val: Expression;
}

export interface GetVarExpression extends LocatedNode {
  type: "getVar";
  var: Symbol;
}

export interface FuncCallExpression extends LocatedNode {
  type: "funcCall";
  func: Symbol;
  args: Expression[];
}

export interface IfExpression extends LocatedNode {
  type: "if";
  cond: Expression;
  body: Expression;
  final: Expression | null;
}

export interface StrLitExpression extends LocatedNode {
  type: "strLit";
  value: string;
}

export interface NumLitExpression extends LocatedNode {
  type: "numLit";
  value: number;
}

export interface ListExpression extends LocatedNode {
  type: "list";
  elements: Expression[];
}
