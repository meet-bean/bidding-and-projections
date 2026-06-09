/** Matches SLICE.field reference tokens, e.g. F.cost, CTD.qty, LMF.cost. */
const REF_TOKEN = /[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*/g;

/**
 * Evaluate an arithmetic formula whose operands are SLICE.field references.
 * `resolve` maps each reference token to a number. Division by zero and any
 * non-finite result collapse to 0 (matching the engine's derived-field rules).
 */
export function evalFormula(
  formula: string,
  resolve: (token: string) => number,
): number {
  // Substitute every reference token with its resolved numeric value.
  const substituted = formula.replace(REF_TOKEN, (token) => {
    const v = resolve(token);
    return Number.isFinite(v) ? `(${v})` : '(0)';
  });

  // The substituted string must now be numbers + operators only.
  if (!/^[\d\s+\-*/().]*$/.test(substituted)) return 0;

  try {
    // eslint-disable-next-line no-new-func
    const result = Number(new Function(`"use strict"; return (${substituted});`)());
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}
