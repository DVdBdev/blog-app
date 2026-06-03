export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function quotePostgrestFilterValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function containsIlikeFilter(column: string, value: string) {
  return `${column}.ilike.${quotePostgrestFilterValue(`%${escapeLikePattern(value)}%`)}`;
}
