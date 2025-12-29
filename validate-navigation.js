#!/usr/bin/env node

/**
 * Navigation Validation Script
 * Tests the meal planning navigation implementation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Smart Pantry Pro - Navigation Validation\n');

// Test 1: Check if meal planning route exists in App.tsx
console.log('1. Checking meal planning route in App.tsx...');
const appTsxPath = path.join(__dirname, 'src', 'App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');
const hasMealPlanningRoute = appTsxContent.includes('/kitchen/meal-planning') && appTsxContent.includes('<MealPlanningPage');
console.log(`   ✅ Meal planning route exists: ${hasMealPlanningRoute}`);

// Test 2: Check if NavigationHub includes meal planning
console.log('\n2. Checking NavigationHub configuration...');
const navigationHubPath = path.join(__dirname, 'src', 'components', 'navigation', 'NavigationHub.tsx');
const navigationHubContent = fs.readFileSync(navigationHubPath, 'utf8');
const hasMealPlanningNav = navigationHubContent.includes('kitchen-meal-planning') && navigationHubContent.includes('Planification');
console.log(`   ✅ NavigationHub includes meal planning: ${hasMealPlanningNav}`);

// Test 3: Check if meal planning page wrapper exists
console.log('\n3. Checking meal planning page wrapper...');
const mealPlanningPagePath = path.join(__dirname, 'src', 'pages', 'MealPlanningPage.tsx');
const mealPlanningPageExists = fs.existsSync(mealPlanningPagePath);
console.log(`   ✅ MealPlanningPage wrapper exists: ${mealPlanningPageExists}`);

// Test 4: Check if meal planning component exists
console.log('\n4. Checking meal planning component...');
const mealPlanningComponentPath = path.join(__dirname, 'src', 'app', 'meal-planning', 'page.tsx');
const mealPlanningComponentExists = fs.existsSync(mealPlanningComponentPath);
console.log(`   ✅ Meal planning component exists: ${mealPlanningComponentExists}`);

// Test 5: Check backward compatibility redirect
console.log('\n5. Checking backward compatibility redirect...');
const hasBackwardCompatibility = navigationHubContent.includes("'/meal-planning': '/kitchen/meal-planning'");
console.log(`   ✅ Backward compatibility redirect exists: ${hasBackwardCompatibility}`);

// Test 6: Check AppNavigation component
console.log('\n6. Checking AppNavigation component...');
const appNavigationPath = path.join(__dirname, 'src', 'components', 'navigation', 'AppNavigation.tsx');
const appNavigationExists = fs.existsSync(appNavigationPath);
console.log(`   ✅ AppNavigation component exists: ${appNavigationExists}`);

// Test 7: Check responsive navigation components
console.log('\n7. Checking responsive navigation components...');
const mobileNavPath = path.join(__dirname, 'src', 'components', 'navigation', 'MobileNavigation.tsx');
const tabletNavPath = path.join(__dirname, 'src', 'components', 'navigation', 'TabletNavigation.tsx');
const desktopNavPath = path.join(__dirname, 'src', 'components', 'navigation', 'DesktopNavigation.tsx');

const mobileNavExists = fs.existsSync(mobileNavPath);
const tabletNavExists = fs.existsSync(tabletNavPath);
const desktopNavExists = fs.existsSync(desktopNavPath);

console.log(`   ✅ Mobile navigation exists: ${mobileNavExists}`);
console.log(`   ✅ Tablet navigation exists: ${tabletNavExists}`);
console.log(`   ✅ Desktop navigation exists: ${desktopNavExists}`);

// Summary
console.log('\n📊 VALIDATION SUMMARY:');
const checks = [
  hasMealPlanningRoute,
  hasMealPlanningNav,
  mealPlanningPageExists,
  mealPlanningComponentExists,
  hasBackwardCompatibility,
  appNavigationExists,
  mobileNavExists,
  tabletNavExists,
  desktopNavExists
];

const passed = checks.filter(Boolean).length;
const total = checks.length;
const percentage = Math.round((passed / total) * 100);

console.log(`   Tests passed: ${passed}/${total} (${percentage}%)`);

if (passed === total) {
  console.log('\n🎉 ALL NAVIGATION TESTS PASSED! Meal planning feature is properly integrated.');
} else {
  console.log('\n⚠️  Some tests failed. Please check the implementation.');
}

process.exit(passed === total ? 0 : 1);