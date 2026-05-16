import {
  ToolRegistry,
  UnknownToolError,
  ToolArgsValidationError,
  defaultToolRegistry,
} from '../ToolRegistry.js';
import { TOOL_SPECS } from '../schemas/tools.js';

describe('ToolRegistry', () => {
  it('exposes all 21 tool specs from the catalog', () => {
    expect(TOOL_SPECS.length).toBe(21);
    expect(defaultToolRegistry.list().length).toBe(21);
  });

  it('rejects duplicate tool names at construction time', () => {
    const dup = [...TOOL_SPECS, TOOL_SPECS[0]];
    expect(() => new ToolRegistry(dup)).toThrow(/Duplicate tool name/);
  });

  it('get(name) returns the right spec, throws on unknown', () => {
    const spec = defaultToolRegistry.get('add_inventory_items');
    expect(spec.defaultRiskTier).toBe('low');
    expect(spec.reversible).toBe(true);
    expect(() => defaultToolRegistry.get('does_not_exist')).toThrow(UnknownToolError);
  });

  describe('parseArgs', () => {
    it('returns typed args on valid input', () => {
      const args = defaultToolRegistry.parseArgs('add_inventory_items', {
        items: [{ name: 'Tomate', quantity: 2 }],
      });
      expect(args).toEqual({ items: [{ name: 'Tomate', quantity: 2 }] });
    });

    it('throws ToolArgsValidationError with issues on invalid input', () => {
      try {
        defaultToolRegistry.parseArgs('add_inventory_items', { items: [] });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ToolArgsValidationError);
        expect((err as ToolArgsValidationError).toolName).toBe('add_inventory_items');
        expect((err as ToolArgsValidationError).issues.length).toBeGreaterThan(0);
      }
    });

    it('rejects expiry_date with invalid ISO format', () => {
      expect(() =>
        defaultToolRegistry.parseArgs('add_inventory_items', {
          items: [{ name: 'Tomate', quantity: 1, expiry_date: '08/05/2026' }],
        })
      ).toThrow(ToolArgsValidationError);
    });

    it('rejects negative quantity', () => {
      expect(() =>
        defaultToolRegistry.parseArgs('add_inventory_items', {
          items: [{ name: 'Tomate', quantity: -1 }],
        })
      ).toThrow(ToolArgsValidationError);
    });

    it('accepts add_recipe_to_meal_plan with all required fields', () => {
      const args = defaultToolRegistry.parseArgs('add_recipe_to_meal_plan', {
        recipe_id: '11111111-1111-1111-1111-111111111111',
        week_start: '2026-05-04',
        day_of_week: 1,
        meal_type: 'dinner',
      });
      expect(args).toBeDefined();
    });

    it('rejects add_recipe_to_meal_plan with day_of_week out of range', () => {
      expect(() =>
        defaultToolRegistry.parseArgs('add_recipe_to_meal_plan', {
          recipe_id: '11111111-1111-1111-1111-111111111111',
          week_start: '2026-05-04',
          day_of_week: 7,
          meal_type: 'dinner',
        })
      ).toThrow(ToolArgsValidationError);
    });

    it('rejects mark_shopping_items_bought with non-uuid', () => {
      expect(() =>
        defaultToolRegistry.parseArgs('mark_shopping_items_bought', {
          shopping_item_ids: ['not-a-uuid'],
        })
      ).toThrow(ToolArgsValidationError);
    });
  });

  describe('toOpenAITools', () => {
    it('returns all 21 functions when no whitelist is given', () => {
      const tools = defaultToolRegistry.toOpenAITools();
      expect(tools.length).toBe(21);
      expect(tools[0].type).toBe('function');
      expect(tools[0].function).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          description: expect.any(String),
          parameters: expect.objectContaining({ type: 'object' }),
        })
      );
    });

    it('respects the whitelist', () => {
      const tools = defaultToolRegistry.toOpenAITools([
        'add_shopping_items',
        'mark_shopping_items_bought',
      ]);
      expect(tools.map((t) => t.function.name)).toEqual([
        'add_shopping_items',
        'mark_shopping_items_bought',
      ]);
    });

    it('preserves declaration order in the output', () => {
      const tools = defaultToolRegistry.toOpenAITools();
      const namesFromCatalog = TOOL_SPECS.map((s) => s.name);
      expect(tools.map((t) => t.function.name)).toEqual(namesFromCatalog);
    });
  });
});
