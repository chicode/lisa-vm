import * as ast from "./ast";
import { pureLocation } from "./util";

export class LisaError extends Error {
  constructor(msg: string, public location: any) {
    super(msg);
  }

  static fromNode(node: ast.LocatedNode, msg: string) {
    return new LisaError(msg, pureLocation(node));
  }
}
