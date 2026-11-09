# 🔒 Cipher Meal Planning Integration Guide

## Overview

This guide documents the implementation of secure meal planning with Cipher encryption and intelligent family mode features, following PRP-040.3 Intelligence Contextuelle specifications.

## Features Implemented

### 1. 🔐 Cipher Encryption
- **AES-256-GCM encryption** for meal plan data
- Secure storage with authentication tags
- Version control for encryption formats
- Real-time encryption status display

### 2. 👨‍👩‍👧‍👦 Family Mode Integration
- Multi-profile support (parents, children, teens)
- Age-appropriate UI adaptations
- Supervision levels (high, medium, low)
- Family-wide dietary restrictions management

### 3. 🧠 Navigation Intelligence
- Time-based suggestions (meal planning reminders)
- Pattern recognition for user habits
- Context-aware recommendations
- Priority-based suggestion ranking

## Architecture

### Services Created

```
src/services/navigation-intelligence/
├── CipherMealPlanningIntegration.ts  # Main encryption service
└── FamilyContextualIntelligence.ts   # Family mode intelligence

src/hooks/
└── useCipherMealPlanning.ts          # Enhanced hook with cipher & family

src/pages/
└── CipherMealPlanningPage.tsx        # Enhanced UI with security features
```

### Key Components

#### CipherMealPlanningIntegration Service
```typescript
// Encrypts meal planning data
storeEncryptedMealPlan(mealPlan, context)

// Decrypts with intelligent suggestions
retrieveAndDecryptMealPlan(planId, userId, context)

// Analyzes patterns for navigation
analyzeMealPlanningPatterns(userId, timeRange)

// Family optimizations
optimizeMealPlanForFamily(mealPlan, context)
```

#### useCipherMealPlanning Hook
```typescript
const {
  // Cipher features
  encryptMealPlan,
  decryptMealPlan,
  isSecure,
  
  // Family features
  switchFamilyProfile,
  getFamilyAdaptedSuggestions,
  
  // Navigation intelligence
  navigationSuggestions,
  handleSmartNavigation
} = useCipherMealPlanning();
```

## Usage Examples

### Basic Secure Meal Planning
```typescript
// Generate and encrypt a meal plan
await generateSecureMealPlan({
  dietaryRestrictions: ['vegetarian'],
  familySize: 4
});

// The plan is automatically encrypted after generation
```

### Family Mode Usage
```typescript
// Switch to child profile
await switchFamilyProfile('child-profile-id');

// UI automatically adapts:
// - Simplified language
// - Larger buttons
// - Fun animations
// - Restricted features
```

### Navigation Intelligence
```typescript
// System automatically suggests:
// - "Plan meals for the week" on Sunday evenings
// - "Generate shopping list" when inventory is low
// - "Review budget" when spending exceeds limits
```

## Security Features

### Data Encryption
- All meal plans encrypted with AES-256-GCM
- Unique IV for each encryption
- Authentication tags prevent tampering
- Encryption keys derived from user credentials

### Family Safety
- Child profiles have restricted access
- Parental approval for sensitive actions
- Time-based restrictions for children
- Activity logging for supervision

## UI Enhancements

### Security Indicators
- 🔒 Lock icon shows encryption status
- Green bar for secured plans
- Yellow bar for unencrypted data
- Real-time status updates

### Family Adaptations
- Profile switcher in header
- Age-appropriate language
- Visual cues for children
- Simplified navigation for kids

### Smart Suggestions
- Card-based suggestion display
- Priority indicators (1-10)
- One-click actions
- Auto-dismiss after action

## Testing

### Unit Tests
```bash
npm test cipher-meal-planning.test.tsx
```

Tests cover:
- Encryption/decryption flow
- Family profile switching
- Navigation suggestions
- UI adaptations

### Integration Testing
1. Create a meal plan
2. Verify encryption status
3. Switch family profiles
4. Check UI adaptations
5. Test navigation suggestions

## Configuration

### Environment Variables
```env
CIPHER_ENCRYPTION_KEY=your-encryption-key-here
VITE_OPENAI_API_KEY=your-openai-key
```

### Family Mode Setup
```typescript
// Enable family mode in settings
const familyConfig = {
  supervisionLevel: 'medium',
  sharedInventory: true,
  coordinatedPlanning: true,
  childTimeRestrictions: {
    allowedHours: { start: 8, end: 20 },
    maxSessionDuration: 60
  }
};
```

## Performance Considerations

- Encryption adds ~50ms to save operations
- Decryption adds ~30ms to load operations
- Navigation suggestions cached for 5 minutes
- Family adaptations computed on-demand

## Future Enhancements

1. **Biometric Authentication**: Add fingerprint/face unlock for meal plans
2. **Cross-Device Sync**: Encrypted sync across family devices
3. **ML Improvements**: Better pattern recognition for suggestions
4. **Voice Integration**: Voice commands for meal planning

## Troubleshooting

### Common Issues

1. **Encryption Fails**
   - Check encryption key is set
   - Verify user is authenticated
   - Check browser crypto API support

2. **Family Mode Not Working**
   - Ensure family profiles are created
   - Check supervision settings
   - Verify age restrictions

3. **No Navigation Suggestions**
   - Wait for pattern learning (needs 5+ interactions)
   - Check time/date settings
   - Verify user preferences saved

## Migration Guide

To upgrade existing meal plans:

```typescript
// 1. Load existing plan
const plan = await loadMealPlan(planId);

// 2. Encrypt with Cipher
await encryptMealPlan();

// 3. Enable family mode
await activateFamilyMode(familyProfiles);
```

## Security Best Practices

1. **Never log encryption keys**
2. **Rotate keys periodically**
3. **Use secure random IVs**
4. **Validate all inputs**
5. **Audit family access logs**

## Support

For issues or questions:
- Check console for encryption errors
- Review family mode permissions
- Verify navigation patterns are being recorded
- Contact support with encrypted plan ID