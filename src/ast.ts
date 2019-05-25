export interface LocatedNode {
  location: any;
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
  | DoExpression
  | WhileExpression
  | FuncExpression
  | DefVarExpression
  | DefFuncExpression
  | StrLitExpression
  | NumLitExpression
  | ListExpression;

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

export interface DoExpression extends LocatedNode {
  type: "do";
  body: Expression[];
}

export interface WhileExpression extends LocatedNode {
  type: "while";
  cond: Expression;
  body: Expression[];
}

export interface FuncExpression extends LocatedNode {
  type: "func";
  func: FuncDecl;
}

export interface DefVarExpression extends LocatedNode {
  type: "defVar";
  varType: VarDecl;
  var: Symbol;
  init: Expression | null;
}

export interface DefFuncExpression extends LocatedNode {
  type: "defFunc";
  name: Symbol;
  func: FuncDecl;
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
