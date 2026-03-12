---
name: brainstorming
description: Use when creating or developing, before writing code or implementation plans - refines rough ideas into fully-formed designs through collaborative questioning, alternative exploration, and incremental validation. Don't use during clear 'mechanical' processes
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through collaborative questioning.

When used in **batch mode** (automated task analysis), generate a structured set of clarification questions upfront.
When used in **interactive mode** (live conversation), ask questions one at a time.

## Batch Mode (Automated Task Analysis)

When analyzing a task to generate clarification questions:

1. **Analyze the task deeply** - Identify gaps in requirements, ambiguities, and decisions needed
2. **Generate 5-12 targeted questions** based on task complexity
3. **Use multiple choice whenever possible** - Provide 4-6 concrete, contextually relevant options
4. **Lead with recommended options** - Put the most sensible default first
5. **Cover key decision areas:**
   - Purpose & success criteria
   - Technical constraints & stack choices
   - User experience & workflow
   - Integration points & dependencies
   - Edge cases & error handling
   - Scope boundaries (what's NOT included)

**Question Types:**
- `choice` - Single selection (most common)
- `multi_choice` - Multiple selections allowed
- `boolean` - Yes/No decisions
- `text` - Free-form (use sparingly)

**Output Format:**
```json
{
  "questions": [
    {
      "text": "What database should store user data?",
      "type": "choice",
      "suggestedOptions": [
        "PostgreSQL (robust, production-ready)",
        "SQLite (simple, file-based)",
        "MongoDB (flexible schema)",
        "Use existing database",
        "Other"
      ],
      "required": true
    }
  ]
}
```

## Interactive Mode (Live Conversation)

When working directly with a human:

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria
- Use available MCPs for searching required information.

**Exploring approaches:**
- Propose 4-6 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**
- Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Use elements-of-style:writing-clearly-and-concisely skill if available
- Commit the design document to git

**Implementation (if continuing):**
- Ask: "Ready to set up for implementation?"
- Use superpowers:using-git-worktrees to create isolated workspace
- Use superpowers:writing-plans to create detailed implementation plan

## Key Principles

- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Be specific** - Options should reference actual technologies/patterns relevant to the task
- **Be flexible** - Go back and clarify when something doesn't make sense
