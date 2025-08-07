# Recipe Extraction Fix Documentation

## Problem
The recipe extraction feature was failing with a 404 error when trying to call `/api/extract-recipe`.

## Root Cause
The application uses Vercel serverless functions for API endpoints. These work in production but require special setup for local development. The standard `vercel dev` command requires authentication, which wasn't configured.

## Solution Implemented

### 1. Updated useRecipeParser.ts
Modified the API endpoint URL to use a conditional approach:
```typescript
const isDevelopment = window.location.hostname === 'localhost';
const apiUrl = isDevelopment 
  ? 'http://localhost:3001/api/extract-recipe'
  : '/api/extract-recipe';
```

### 2. Created Local API Server
Created `start-local-api.js` to run a local Express server that loads the Vercel API handlers:
- Runs on port 3001
- Handles CORS
- Loads environment variables from `.env.local`
- Provides the same API endpoints as production

### 3. Added NPM Scripts
Added convenient scripts to `package.json`:
- `npm run api` - Start the local API server
- `npm run dev:full` - Start both API server and Vite dev server

## Local Development Setup

### Option 1: Vercel CLI (Recommended for full compatibility)
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Run development server
npm run dev
```

### Option 2: Local API Server
```bash
# Terminal 1: Start API server
npm run api

# Terminal 2: Start Vite dev server
npm run dev:vite

# Or use the combined command:
npm run dev:full
```

### Option 3: Deploy to Vercel
Deploy the application to Vercel for a production-like environment:
```bash
vercel --prod
```

## Environment Variables
Ensure `.env.local` contains:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Testing the Fix
1. Start the development servers
2. Navigate to the Recipes page
3. Click "Add Recipe"
4. Enter a recipe URL (e.g., https://www.kannammacooks.com/madras-style-prawn-biryani/)
5. Click "Extract from URL"
6. The recipe should be extracted successfully

## Files Modified
- `/src/hooks/useRecipeParser.ts` - Updated API endpoint logic
- `/package.json` - Added new development scripts
- `/start-local-api.js` - Created local API server
- `/vite.config.ts` - Attempted to add API plugin (can be reverted)
- `/server.js` - Created but not needed (can be deleted)
- `/api-server.js` - Created but not needed (can be deleted)
- `/vite-api-plugin.js` - Created but not needed (can be deleted)

## Cleanup (Optional)
Remove unnecessary files created during debugging:
```bash
rm server.js api-server.js vite-api-plugin.js
```

Revert vite.config.ts to original state by removing the apiPlugin import and usage.