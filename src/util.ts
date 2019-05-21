export const hasOwnProperty = (
  obj: Object,
  v: string | number | symbol
): boolean => Object.prototype.hasOwnProperty.call(obj, v);
