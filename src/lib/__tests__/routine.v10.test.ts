import { calendarDate,calendarDaysUntil,pantryDateLabel } from '@smart/shared';
import { routineDestination,isNavigationActive } from '../routineRoutes';
import { mealExclusionReason, mealPreferenceVerificationIssue } from '../mealExclusions';
test('dates-only remain identical before/after Paris midnight, regardless of device timezone',()=>{
  expect(calendarDaysUntil('2026-10-09',new Date('2026-10-08T21:59:59Z'))).toBe(1);
  expect(calendarDaysUntil('2026-10-09',new Date('2026-10-08T22:00:00Z'))).toBe(0);
  expect(calendarDate('2026-10-09','America/Los_Angeles')).toBe('2026-10-09');
  expect(calendarDaysUntil('2026-03-30',new Date('2026-03-28T23:30:00Z'))).toBe(1);
  expect(calendarDate('2026-02-30')).toBeNull();
  expect(pantryDateLabel(null)).toBe('Date inconnue');
});
test('timestamp calendar labels use the same explicit reference zone',()=>{
  expect(calendarDate('2026-10-08T22:10:00Z')).toBe('2026-10-09');
  expect(calendarDate('2026-10-08T22:10:00Z','America/Los_Angeles')).toBe('2026-10-08');
  expect(pantryDateLabel('2026-10-09',new Date('2026-10-08T22:10:00Z'))).toContain('09/10/2026 · aujourd’hui');
});
test('root/legacy links adapt explicitly, preserving a recipe reference through sign-in',()=>{
  expect(routineDestination('/')).toBe('/kitchen');
  expect(routineDestination('/?tab=inventory')).toBe('/pantry/inventory');
  expect(routineDestination('/?tab=shopping')).toBe('/shopping/list');
  expect(routineDestination('/kitchen/recipes/id?source=user_recipes#ingredients')).toBe('/kitchen/recipes/id?source=user_recipes#ingredients');
  expect(routineDestination('//evil.test')).toBe('/kitchen');
  expect(routineDestination('/auth')).toBe('/kitchen');
  expect(isNavigationActive('/kitchen/recipes/id','/kitchen')).toBe(false);
  expect(isNavigationActive('/kitchen/recipes/id','/kitchen/recipes')).toBe(true);
  expect(isNavigationActive('/kitchen/cooking/session','/kitchen/recipes')).toBe(true);
  expect(isNavigationActive('/kitchen/cooking/session','/kitchen')).toBe(false);
});
test('known allergies/exclusions apply without requiring the onboarding form',()=>{
  expect(mealExclusionReason([{ ingredient_name:'Œufs' }],['eggs'],[])).not.toBeNull();
  expect(mealExclusionReason([{ ingredient_name:'Poulet' }],[],['vegetarian'])).not.toBeNull();
  expect(mealExclusionReason([{ ingredient_name:'Beurre' }],[],['vegan'])).not.toBeNull();
  expect(mealExclusionReason([{ ingredient_name:'Fromage' }],['milk'],[])).not.toBeNull();
  expect(mealExclusionReason([{ ingredient_name:'Champignons' }],['champignon'],[])).not.toBeNull();
  expect(mealExclusionReason([{ ingredient_name:'Riz' }],['eggs'],['vegan'])).toBeNull();
});
test('missing certification cannot silently bypass an explicit halal or kosher preference',()=>{
  expect(mealPreferenceVerificationIssue(['halal'])).toContain('halal');
  expect(mealPreferenceVerificationIssue(['kosher'])).toContain('casher');
  expect(mealExclusionReason([{ ingredient_name:'Riz' }],[],['halal'])).not.toBeNull();
  expect(mealPreferenceVerificationIssue(['vegetarian'])).toBeNull();
});
