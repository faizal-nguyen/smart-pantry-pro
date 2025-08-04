# CLAUDE.md - Smart Pantry Pro

This file provides guidance to Claude Code when working with the Smart Pantry Pro codebase.

## Project Overview

Smart Pantry Pro is a comprehensive pantry management application built with:
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Drizzle ORM
- Features: Recipe management, pantry tracking, shopping lists, meal planning

## Cypher Agent System

This project uses the Cypher Agent System - a collection of specialized AI agents available as commands in `.claude/commands/`.

### Primary Orchestrators

#### For Debugging
**ALWAYS use `debug-orchestrator` command for:**
- Complex bugs spanning multiple layers
- Errors with unclear root causes
- Systematic debugging needed
- Performance issues
- Data inconsistencies

#### For Development
**Use `tech-lead-orchestrator` command for:**
- New feature implementation
- Major refactoring
- Architecture decisions
- Complex multi-step tasks

### Agent Routing Protocol

**CRITICAL: Follow this routing protocol:**

1. **Start with orchestrators** for complex tasks
2. **Follow the routing map** returned by orchestrators EXACTLY
3. **Use ONLY the agents** specified in routing maps
4. **Never substitute agents** unless specified as fallback

### Available Commands

All agents are available as commands in `.claude/commands/`. See `COMMANDS_INDEX.md` for the full list.

#### Core Commands
- `code-archaeologist`: Deep code exploration
- `code-reviewer`: Code quality and reviews
- `documentation-specialist`: Documentation tasks
- `performance-optimizer`: Performance optimization

#### Frontend Commands
- `react-component-architect`: React component design
- `react-nextjs-expert`: Next.js specific tasks
- `frontend-developer`: General frontend development
- `tailwind-css-expert`: Tailwind CSS styling

#### Backend Commands
- `backend-developer`: Backend development
- `api-architect`: API design and implementation
- `debug-agent`: General debugging utilities

#### Universal Commands
- `frontend-developer`: Frontend tasks
- `backend-developer`: Backend tasks
- `api-architect`: API development
- `tailwind-css-expert`: Styling

## Development Guidelines

### Code Style
- Use TypeScript with strict type checking
- Follow existing patterns in the codebase
- Use Tailwind CSS for styling
- Implement proper error handling

### Database Operations
- Use Drizzle ORM for all database operations
- Follow existing schema patterns
- Always validate data before database operations
- Handle migrations carefully

### API Development
- Follow RESTful conventions
- Implement proper authentication checks
- Validate request data
- Return consistent error responses

### Testing
- Write tests for new features
- Run existing tests before committing
- Check lint and type errors

## Common Tasks

### Bug Fixing
```
1. Use debug-orchestrator command for complex bugs
2. Follow the debugging workflow
3. Test the fix thoroughly
4. Update relevant documentation
```

### Feature Implementation
```
1. Use tech-lead-orchestrator command for planning
2. Follow the agent routing map
3. Implement incrementally
4. Test each component
```

### Performance Optimization
```
1. Use performance-optimizer command for analysis
2. Profile the specific issue
3. Implement optimizations
4. Measure improvements
```

## Important Files

- `/src/server/api/`: Backend API routes
- `/src/app/`: Next.js app router pages
- `/src/components/`: React components
- `/src/server/db/`: Database schema and queries
- `/drizzle/`: Database migrations

## Security Considerations

- Never expose sensitive data in logs
- Validate all user inputs
- Use proper authentication checks
- Follow OWASP guidelines
- Sanitize data before database operations

## Debugging Tips

1. Check browser console for frontend errors
2. Review server logs for backend issues
3. Verify database schema matches models
4. Test API endpoints independently
5. Use the debug-orchestrator command for systematic debugging

## Agent Usage Examples

### Complex Bug
```
"Recipe ingredients not saving correctly"
→ Use debug-orchestrator command
→ It will coordinate database, API, and frontend debugging
```

### New Feature
```
"Add meal planning feature"
→ Use tech-lead-orchestrator command
→ It will create a comprehensive implementation plan
```

### Performance Issue
```
"Recipe search is slow"
→ Use performance-optimizer command
→ It will analyze and optimize the bottleneck
```

Remember: The Cypher agents are here to help you work more efficiently. Use them proactively for better results!