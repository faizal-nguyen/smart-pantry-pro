---
description: Start the Smart Grocery dev server on port 3030
allowed-tools: Bash(cd:*), Bash(npm run:*), Bash(PORT=*)
---

Start the Smart Grocery development server on port 3030.

First, navigate to the smart-pantry-pro directory and build shared packages:
!cd smart-pantry-pro && npm run shared:build

Then start both the API and web dev servers on port 3030:
!cd smart-pantry-pro && PORT=3030 npm run dev
