import { LocatedNode } from "./ast";

export const pureLocation = (node: LocatedNode): LocatedNode => ({
  startRow: node.startRow,
  startCol: node.startCol,
  endRow: node.endRow,
  endCol: node.endCol
});
