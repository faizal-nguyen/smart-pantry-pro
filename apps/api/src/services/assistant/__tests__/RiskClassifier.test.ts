import { classifyRisk } from '../RiskClassifier.js';
import { defaultToolRegistry } from '../ToolRegistry.js';

const spec = (name: string) => defaultToolRegistry.get(name);

describe('RiskClassifier', () => {
  describe('default tier (no escalation)', () => {
    it.each([
      ['read_inventory', 'read'],
      ['read_shopping_list', 'read'],
      ['find_cookable_recipes', 'read'],
      ['suggest_recipes_for_context', 'read'],
      ['add_inventory_items', 'low'],
      ['mark_shopping_items_bought', 'low'],
      ['consume_inventory_items', 'medium'],
      ['update_inventory_item', 'medium'],
      ['delete_recipe', 'high'],
      ['import_recipe_from_url', 'high'],
      ['ask_clarification', 'low'],
    ])('%s defaults to %s', (toolName, expectedTier) => {
      const result = classifyRisk(spec(toolName), { items: [{ name: 'x', quantity: 1 }] });
      expect(result.tier).toBe(expectedTier);
    });
  });

  describe('volume escalation (>10 items)', () => {
    it('escalates add_inventory_items to high when 11 items', () => {
      const items = Array.from({ length: 11 }, (_, i) => ({ name: `it${i}`, quantity: 1 }));
      const result = classifyRisk(spec('add_inventory_items'), { items });
      expect(result.tier).toBe('high');
      expect(result.escalatedFrom).toBe('low');
      expect(result.reason).toMatch(/Volume/);
    });

    it('does NOT escalate add_inventory_items at 10 items (boundary)', () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ name: `it${i}`, quantity: 1 }));
      const result = classifyRisk(spec('add_inventory_items'), { items });
      expect(result.tier).toBe('low');
      expect(result.escalatedFrom).toBeUndefined();
    });

    it('escalates add_shopping_items to high when 25 items', () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ name: `it${i}`, quantity: 1 }));
      const result = classifyRisk(spec('add_shopping_items'), { items });
      expect(result.tier).toBe('high');
    });

    it('escalates consume_inventory_items to high when 12 items', () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        inventory_id: '11111111-1111-1111-1111-111111111111',
        quantity: 1,
      }));
      const result = classifyRisk(spec('consume_inventory_items'), { items });
      expect(result.tier).toBe('high');
      expect(result.escalatedFrom).toBe('medium');
    });
  });

  describe('ambiguity escalation on consume', () => {
    it('escalates consume_inventory_items to high when an inventory_id is in ambiguousInventoryIds', () => {
      const ambiguousId = '22222222-2222-2222-2222-222222222222';
      const result = classifyRisk(
        spec('consume_inventory_items'),
        { items: [{ inventory_id: ambiguousId, quantity: 1 }] },
        { ambiguousInventoryIds: [ambiguousId] }
      );
      expect(result.tier).toBe('high');
      expect(result.reason).toMatch(/ambigu/);
    });

    it('stays at medium when ambiguousInventoryIds is empty', () => {
      const result = classifyRisk(
        spec('consume_inventory_items'),
        { items: [{ inventory_id: '22222222-2222-2222-2222-222222222222', quantity: 1 }] },
        { ambiguousInventoryIds: [] }
      );
      expect(result.tier).toBe('medium');
    });

    it('stays at medium when the called inventory_id is not in the ambiguous list', () => {
      const result = classifyRisk(
        spec('consume_inventory_items'),
        { items: [{ inventory_id: '22222222-2222-2222-2222-222222222222', quantity: 1 }] },
        { ambiguousInventoryIds: ['33333333-3333-3333-3333-333333333333'] }
      );
      expect(result.tier).toBe('medium');
    });
  });

  describe('quantity=0 escalation on update', () => {
    it('escalates update_inventory_item with quantity=0 to high', () => {
      const result = classifyRisk(spec('update_inventory_item'), {
        inventory_id: '11111111-1111-1111-1111-111111111111',
        quantity: 0,
      });
      expect(result.tier).toBe('high');
      expect(result.reason).toMatch(/supprimer/);
    });

    it('stays at medium with quantity > 0', () => {
      const result = classifyRisk(spec('update_inventory_item'), {
        inventory_id: '11111111-1111-1111-1111-111111111111',
        quantity: 5,
      });
      expect(result.tier).toBe('medium');
    });
  });

  describe('clear_inventory_category surfaces a reason', () => {
    it('stays high and adds a category-specific reason', () => {
      const result = classifyRisk(spec('clear_inventory_category'), {
        category: 'produits-laitiers',
      });
      expect(result.tier).toBe('high');
      expect(result.reason).toMatch(/produits-laitiers/);
    });
  });

  describe('escalation never lowers the tier', () => {
    it('high-tier tool stays high even with low-volume args', () => {
      const result = classifyRisk(spec('delete_recipe'), {
        recipe_id: '11111111-1111-1111-1111-111111111111',
      });
      expect(result.tier).toBe('high');
    });
  });
});
