import * as ast from "./ast";

export class LisaError extends Error {
  constructor(msg: string, public location: any) {
    super(msg);
  }

  static fromNode(node: ast.LocatedNode, msg: string) {
    return new LisaError(msg, node.location);
  }
}
