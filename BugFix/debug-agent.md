# Debug Agent System - Smart Pantry Pro

## Overview

This document describes the Cypher Debug Agent System for Smart Pantry Pro, a sophisticated orchestration framework for systematic debugging and issue resolution.

## Cypher Debug Orchestrator

The main entry point for debugging complex issues is the **debug-orchestrator** command (located in `.claude/commands/debug-orchestrator.md`), which coordinates specialized debugging agents to systematically identify, analyze, and resolve bugs across the entire stack.

### Key Features

1. **Intelligent Routing**: Automatically dispatches to appropriate specialized agents based on issue type
2. **Systematic Approach**: Follows a structured debugging workflow with phases
3. **Cross-Layer Analysis**: Coordinates investigation across frontend, backend, database, and integrations
4. **Evidence-Based**: All findings based on concrete code analysis and logs

### Usage

To use the debug orchestrator:

```
Use the debug-orchestrator command when:
- Encountering complex bugs requiring multi-faceted analysis
- Errors span multiple layers of the application  
- Root cause is unclear and requires systematic investigation
- Need coordinated debugging across the stack
```

## Available Debug Agents

The system includes specialized agents for different debugging scenarios:

### Core Debug Agents
- **error-analyzer**: Error parsing and stack trace analysis
- **code-archaeologist**: Deep code exploration and understanding
- **code-reviewer**: Code quality and bug pattern detection
- **performance-optimizer**: Performance bottleneck identification

### Layer-Specific Debug Agents
- **frontend-debugger**: React/Next.js specific debugging
- **backend-debugger**: Node.js/Express debugging
- **database-debugger**: PostgreSQL query and schema issues
- **api-debugger**: REST API and integration issues

### Analysis Agents
- **data-flow-analyzer**: Data transformation and flow issues
- **root-cause-analyzer**: Root cause synthesis and recommendations

## Debugging Workflow

The orchestrator follows a three-phase approach:

### Phase 1: Issue Analysis & Triage
- Parse error messages and user reports
- Identify affected components
- Determine severity and scope
- Flag security/data implications

### Phase 2: Agent Routing
- Create specific routing map for the issue
- Assign primary and fallback agents
- Define investigation sequence
- Specify handoff information

### Phase 3: Coordinated Execution
- Execute agents in sequence
- Pass context between invocations
- Build cumulative understanding
- Synthesize final recommendations

## Smart Pantry Pro Context

Key areas the debug system investigates:

### Frontend Layer
- React component issues
- Next.js routing problems
- State management bugs
- UI/UX inconsistencies
- Tailwind CSS styling

### Backend Layer
- Express route errors
- Middleware failures
- Authentication issues
- Data validation problems
- Business logic bugs

### Database Layer
- PostgreSQL query errors
- Drizzle ORM issues
- Schema mismatches
- Data integrity problems
- Migration failures

### Integration Layer
- External API failures
- Recipe search issues
- Image processing errors
- CORS problems
- Timeout issues

## Common Bug Patterns

The debug system is optimized to detect:

1. **Data Inconsistency**
   - Recipe ingredients schema mismatches
   - Orphaned pantry references
   - Shopping list sync issues

2. **Performance Issues**
   - N+1 query problems
   - Unoptimized images
   - Memory leaks
   - Slow API responses

3. **State Management**
   - React state sync problems
   - Context conflicts
   - Stale closures
   - Race conditions

4. **Integration Failures**
   - API timeouts
   - Auth token expiration
   - Rate limiting
   - Network errors

## Using the Debug System

### For Simple Issues
Use specific debug agents directly:
```
"Use frontend-debugger command for this React component error"
```

### For Complex Issues
Start with the orchestrator:
```
"Use debug-orchestrator command to investigate this complex bug"
```

### Example Debug Session

```
User: "Recipe ingredients are showing incorrectly after saving"

Claude: I'll use debug-orchestrator command to investigate this issue systematically.

[Orchestrator creates routing map]
- database-debugger: Check schema alignment
- data-flow-analyzer: Trace data transformations
- frontend-debugger: Verify UI rendering

[Findings]
Root Cause: Schema mismatch between TypeScript model and database
Fix: Update migration to align recipe_ingredients table
```

## Benefits of Cypher Debug System

1. **Systematic Coverage**: No aspect of the bug is overlooked
2. **Specialized Expertise**: Each agent brings domain-specific knowledge
3. **Efficient Resolution**: Parallel investigation reduces debugging time
4. **Knowledge Transfer**: Detailed findings help prevent future issues
5. **Consistent Quality**: Standardized debugging approach

## Integration with Development Workflow

The debug system integrates seamlessly with:
- Git for code analysis
- VS Code diagnostics
- Test frameworks
- Build tools
- Deployment pipelines

## Future Enhancements

Planned improvements:
- Auto-detection of common bug patterns
- Machine learning for issue prediction
- Integration with monitoring systems
- Automated fix generation for known patterns