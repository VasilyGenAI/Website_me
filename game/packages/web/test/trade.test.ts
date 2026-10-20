import { describe, expect, it } from 'vitest';
import { bankPlan } from '../src/components/TradeComposer';

const c = (p: Partial<Record<'lumber' | 'brick' | 'wool' | 'grain' | 'ore', number>>) => ({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, ...p });
const bank = c({ lumber: 19, brick: 19, wool: 19, grain: 19, ore: 19 });
const plain = c({ lumber: 4, brick: 4, wool: 4, grain: 4, ore: 4 });

describe('bank trades in the trade bar', () => {
  it('needs 4 of a kind without a harbour', () => {
    expect(bankPlan(c({ wool: 4 }), c({ lumber: 1 }), plain, bank)).toEqual({ ok: true, steps: [{ give: 'wool', get: 'lumber' }] });
    expect(bankPlan(c({ wool: 3 }), c({ lumber: 1 }), plain, bank).ok).toBe(false);
    expect(bankPlan(c({ wool: 1 }), c({ lumber: 1 }), plain, bank)).toMatchObject({ ok: false, reason: expect.stringContaining('4:1') });
  });

  it('uses 3:1 and 2:1 harbour ratios', () => {
    const ratios = c({ lumber: 3, brick: 3, wool: 2, grain: 3, ore: 3 });
    expect(bankPlan(c({ wool: 2 }), c({ ore: 1 }), ratios, bank).ok).toBe(true);
    expect(bankPlan(c({ grain: 3 }), c({ ore: 1 }), ratios, bank).ok).toBe(true);
    expect(bankPlan(c({ grain: 4 }), c({ ore: 1 }), ratios, bank).ok).toBe(false);
  });

  it('combines several sets into several cards', () => {
    const ratios = c({ lumber: 4, brick: 4, wool: 2, grain: 4, ore: 4 });
    const plan = bankPlan(c({ wool: 4, grain: 4 }), c({ ore: 2, brick: 1 }), ratios, bank);
    expect(plan).toEqual({ ok: true, steps: [{ give: 'wool', get: 'brick' }, { give: 'wool', get: 'ore' }, { give: 'grain', get: 'ore' }] });
    expect(bankPlan(c({ wool: 4 }), c({ ore: 1 }), ratios, bank)).toMatchObject({ ok: false, reason: expect.stringContaining('2 Rohstoff') });
  });

  it('refuses the same resource on both sides and an empty bank', () => {
    expect(bankPlan(c({ wool: 4 }), c({ wool: 1 }), plain, bank).ok).toBe(false);
    expect(bankPlan(c({ wool: 4 }), c({ ore: 1 }), plain, c({})).ok).toBe(false);
  });
});
