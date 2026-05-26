import { describe, it, expect } from 'vitest';
import { computeTooltipLeft } from './tooltip-flip';

describe('computeTooltipLeft', () => {
  it('renders to the right of the cursor when there is room', () => {
    expect(
      computeTooltipLeft({ cursorX: 100, tooltipWidth: 80, innerWidth: 400, gutter: 12 })
    ).toBe(112);
  });

  it('flips to the left of the cursor when right-side would overflow', () => {
    // right: 380+12+80 = 472 > 400 → flip; left = 380 - 12 - 80 = 288
    expect(
      computeTooltipLeft({ cursorX: 380, tooltipWidth: 80, innerWidth: 400, gutter: 12 })
    ).toBe(288);
  });

  it('clamps to 0 when even the flipped position would be negative', () => {
    // right: 10+12+200 = 222 > 200 → flip; left = 10 - 12 - 200 = -202 → clamp 0
    expect(
      computeTooltipLeft({ cursorX: 10, tooltipWidth: 200, innerWidth: 200, gutter: 12 })
    ).toBe(0);
  });

  it('returns right-side when tooltipWidth is 0 (initial render)', () => {
    expect(computeTooltipLeft({ cursorX: 50, tooltipWidth: 0, innerWidth: 400, gutter: 12 })).toBe(
      62
    );
  });
});
