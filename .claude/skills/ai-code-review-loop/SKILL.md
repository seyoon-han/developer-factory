---
name: ai-code-review-loop
description: Orchestrates a dual-AI engineering loop for planning, implementing, validating and reviewing code with continuous feedback for optimal quality
---

# Code Review Loop

## Overview

A collaborative workflow combining AI implementation with validation and review for high-quality code through continuous feedback cycles.

## When to Use

- Complex feature implementation requiring validation
- Code quality and security are critical
- Architectural review before implementation
- Refactoring with validation

## Prerequisites

User must have codex CLI installed. If unavailable, proceed without validation.

## Core Workflow

### Phase 1: Planning

Create detailed implementation plan:
- Overview and objectives
- Files to create or modify
- Step-by-step approach
- Potential risks and edge cases
- Success criteria

Present plan to user before validation.

### Phase 2: Plan Validation (Codex)

- Model: gpt-5-codex
- Reasoning effort: high

Validate plan with codex using this command pattern:
```bash
echo "Review this implementation plan and identify any issues:

[Insert plan]

Check for:
- Logic errors or flawed assumptions
- Missing edge cases
- Architecture or design issues
- Security concerns
- Performance considerations

Provide specific, actionable feedback." | codex exec -m gpt-5-codex --config model_reasoning_effort=medium --sandbox read-only
```

If issues found, go to Phase 3. Otherwise, proceed to Phase 4.

### Phase 3: Plan Refinement (if needed)

If Codex finds issues:
1. Summarize concerns to user
2. Propose revisions
3. Ask user: revise and re-validate, or proceed with current plan?
4. If revising, repeat Phase 2

### Phase 4: Implementation

Implement using available tools:
- create_file for new files
- str_replace for modifications
- view to read context
- bash_tool for testing

Document each change as you go.

### Phase 5: Code Review (Codex)

After implementation, validate with Codex using this command pattern:
```bash
echo "Review the following implementation:

## What Changed
[List files and changes]

## Implementation Details
[Key decisions]

## Code to Review
[Relevant code or file paths]

Check for:
- Bugs or logic errors
- Security vulnerabilities
- Performance issues
- Best practices
- Edge cases not handled

Provide specific feedback." | codex exec -m gpt-5-codex --config model_reasoning_effort=medium --sandbox read-only
```

Categorize feedback:
- Critical: Fix immediately
- Important: Fix before completion
- Suggestions: Optional improvements

If critical issues found, go to Phase 6.

### Phase 6: Fix and Re-validate

When issues found:
1. Implement fixes for identified issues
2. For significant changes, re-validate using:
```bash
echo "Re-reviewing after fixes:

## Issues Fixed
[List fixes]

## Updated Code
[Relevant sections]

Verify fixes are correct." | codex exec resume --last
```

3. Repeat until validation passes
4. Summarize to user

## Key Commands

Start validation:
```bash
codex exec -m MODEL --config model_reasoning_effort=EFFORT --sandbox read-only
```

Continue session:
```bash
codex exec resume --last
```

## Best Practices

Do:
- Validate plans before major implementation
- Review code after changes
- Apply critical fixes immediately
- Use resume to maintain context
- Provide context to Codex

Avoid:
- Skipping validation for complex features
- Ignoring critical issues
- Over-validating minor changes
- Including sensitive data in validation

## Error Handling

If codex fails:
1. Check installation using: which codex
2. Inform user
3. Offer to proceed without validation

If validation loops too many times (3 or more iterations):
- Ask user if they want to proceed with current state

## The Perfect Loop

The workflow follows this pattern: Plan, Validate, Refine if needed, Implement, Review, Fix, Re-validate, Complete

For detailed examples, troubleshooting, and advanced patterns, see REFERENCE.md files.
