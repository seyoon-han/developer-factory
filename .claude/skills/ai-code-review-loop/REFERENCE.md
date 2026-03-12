# Codex-Claude Loop - Reference Guide

## Detailed Examples

### Complete Example: JWT Authentication

**User Request:** "Add user authentication with JWT"

#### Phase 1: Claude's Plan

```markdown
## Implementation Plan: JWT Authentication

### Objectives
- Secure user authentication with JWT tokens
- Implement login and token refresh
- Protected route middleware

### Files to Create/Modify
- `middleware/auth.js` - JWT verification middleware
- `routes/auth.js` - Login and refresh endpoints
- `utils/jwt.js` - Token generation and validation
- `config/auth.js` - JWT configuration

### Implementation Steps
1. Create JWT utility functions (generate, verify, refresh)
2. Implement login endpoint with token generation
3. Create authentication middleware
4. Add token refresh logic
5. Protect existing routes with middleware

### Potential Issues
- Token expiration timing
- Refresh token security
- Concurrent token refresh requests

### Success Criteria
- [ ] User can login with credentials
- [ ] Access token expires after 15 minutes
- [ ] Refresh token works correctly
- [ ] Protected routes require valid token
- [ ] Token validation handles edge cases
```

#### Phase 2: Codex Validation

**Input to Codex:**
```bash
echo "Review this implementation plan and identify any issues:

[Full plan above]

Check for:
- Logic errors or flawed assumptions
- Missing edge cases
- Architecture or design issues
- Security concerns
- Performance considerations

Provide specific, actionable feedback." | codex exec -m gpt-5-codex --config model_reasoning_effort=medium --sandbox read-only
```

**Codex Response:**
```
Issues found:

1. CRITICAL: Refresh token storage not specified
   - Where will refresh tokens be stored?
   - Consider database with expiration tracking

2. SECURITY: Token rotation not mentioned
   - Refresh tokens should be single-use
   - Implement token rotation on refresh

3. EDGE CASE: Concurrent refresh requests
   - Multiple simultaneous requests could invalidate tokens
   - Need mutex/lock mechanism

4. MISSING: Token revocation strategy
   - How to invalidate tokens on logout?
   - Consider token blacklist or short-lived tokens

Recommendations:
- Add refresh token table with user_id, token_hash, expires_at
- Implement token rotation (issue new refresh token on each use)
- Add rate limiting to refresh endpoint
- Consider Redis for token blacklist
```

#### Phase 3: Plan Refinement

Claude revises the plan:
```markdown
## Updated Implementation Plan: JWT Authentication

[Previous sections...]

### Updated Files
- `models/RefreshToken.js` - Refresh token model
- `middleware/rateLimiter.js` - Rate limiting middleware
- `utils/tokenBlacklist.js` - Token revocation (Redis)

### Updated Implementation Steps
1. Create JWT utility with token rotation
2. Create RefreshToken database model
3. Implement login with both access and refresh tokens
4. Add token refresh with rotation (single-use refresh tokens)
5. Implement token revocation/blacklist
6. Add rate limiting to auth endpoints
7. Create authentication middleware with blacklist check
8. Protect routes with middleware

### Additional Success Criteria
- [ ] Refresh tokens are single-use (rotated)
- [ ] Tokens can be revoked on logout
- [ ] Rate limiting prevents brute force
- [ ] Concurrent refresh requests handled safely
```

#### Phase 4: Implementation

Claude implements the code:
```javascript
// utils/jwt.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { 
    expiresIn: '15m' 
  });
};

exports.generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// [Continue implementation...]
```

#### Phase 5: Code Review

**Input to Codex:**
```bash
echo "Review the following implementation:

## What Changed
- Created utils/jwt.js with token generation
- Created models/RefreshToken.js with Sequelize model
- Implemented routes/auth.js with login and refresh
- Added middleware/auth.js for route protection
- Added Redis-based token blacklist

## Implementation Details
- Access tokens expire in 15 minutes
- Refresh tokens stored in database with hash
- Token rotation on each refresh
- Rate limiting: 5 requests per 15 minutes

## Code to Review
[Include actual code files]

Check for:
- Bugs or logic errors
- Security vulnerabilities
- Performance issues
- Best practices
- Edge cases not handled

Provide specific feedback." | codex exec -m gpt-5-codex --config model_reasoning_effort=medium --sandbox read-only
```

**Codex Response:**
```
Issues found:

1. BUG in routes/auth.js line 45:
   - Token not verified before refresh
   - Attacker could refresh expired/invalid tokens
   - FIX: Verify old access token structure (not expiration)

2. SECURITY in middleware/auth.js line 23:
   - Error message reveals if user exists
   - Information disclosure vulnerability
   - FIX: Generic "Invalid token" message

3. PERFORMANCE in tokenBlacklist.js:
   - No TTL set on Redis keys
   - Memory leak potential
   - FIX: Set TTL matching token expiration

4. EDGE CASE: Refresh token cleanup
   - Expired refresh tokens not deleted
   - Database bloat over time
   - FIX: Add cron job or TTL index
```

#### Phase 6: Fixes

Claude applies fixes and re-validates:

```javascript
// Fixed routes/auth.js line 45
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  // Verify old access token structure (not expiration)
  const oldAccessToken = req.headers.authorization?.split(' ')[1];
  try {
    jwt.verify(oldAccessToken, process.env.JWT_SECRET, { 
      ignoreExpiration: true 
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // [Rest of refresh logic...]
});
```

**Re-validate with Codex:**
```bash
echo "Re-reviewing after fixes:

## Issues Fixed
1. Added token verification before refresh
2. Generic error messages to prevent information disclosure
3. Redis TTL set to match token expiration
4. Added TTL index on refresh_tokens table

## Updated Code
[Show fixed sections]

Verify fixes are correct." | codex exec resume --last
```

**Codex Final Review:**
```
Validation passed!

All critical issues resolved:
- Token verification before refresh ✓
- Information disclosure fixed ✓
- Redis TTL configured ✓
- Database cleanup strategy ✓

Minor suggestions:
- Consider adding request logging for security audit
- Add unit tests for token rotation logic

Code is production-ready.
```

#### Final Summary

```
Implementation complete and validated!

Changes made:
- JWT authentication with access and refresh tokens
- Token rotation for enhanced security
- Redis-based token blacklist
- Rate limiting on auth endpoints
- Comprehensive error handling

Codex review: All security concerns addressed, production-ready
```

## Common Patterns

### Pattern 1: API Endpoint Creation

**User Request:** "Add endpoint to fetch user profile"

**Claude's Approach:**
1. Plan: Define route, controller, validation, error handling
2. Validate with Codex (check for SQL injection, proper auth, etc.)
3. Implement: Create route, controller, tests
4. Review with Codex (check implementation quality)
5. Fix any issues found
6. Complete

### Pattern 2: Database Schema Changes

**User Request:** "Add comments feature to posts"

**Claude's Approach:**
1. Plan: Design schema, relationships, indexes, migration
2. Validate with Codex (check for performance issues, normalization)
3. Implement: Create migration, models, relationships
4. Review with Codex (check for migration issues, index optimization)
5. Fix and re-validate
6. Complete

### Pattern 3: Refactoring

**User Request:** "Refactor authentication logic"

**Claude's Approach:**
1. Plan: Identify code to refactor, new structure, migration path
2. Validate with Codex (ensure no breaking changes)
3. Implement: Refactor incrementally, maintain backward compatibility
4. Review with Codex (check for regressions)
5. Fix any issues
6. Complete

## Reasoning Effort Guidelines

### Low Reasoning (Quick Validation)
- Simple CRUD endpoints
- Minor bug fixes
- Straightforward features
- Code formatting changes

### Medium Reasoning (Default)
- Standard feature implementation
- Moderate complexity logic
- API integrations
- Database queries

### High Reasoning (Deep Analysis)
- Security-critical code (authentication, authorization)
- Complex algorithms
- Performance-critical sections
- Distributed systems logic
- Financial calculations

## Model Selection

### gpt-5-codex
- Code-focused tasks
- Implementation review
- Best practices validation
- Performance optimization
- Default choice for most tasks

### gpt-5
- Architectural decisions
- Complex logic validation
- System design review
- Security architecture
- When deeper reasoning needed

## Advanced Techniques

### Incremental Validation

For large features, validate incrementally:

```bash
# Validate plan
echo "Validate overall plan" | codex exec -m gpt-5-codex --config model_reasoning_effort=medium --sandbox read-only

# Implement part 1
[Claude implements]

# Validate part 1
echo "Review part 1 implementation" | codex exec resume --last

# Implement part 2
[Claude implements]

# Validate part 2
echo "Review part 2 implementation" | codex exec resume --last

# Continue...
```

### Context-Rich Validation

Provide more context for better reviews:

```bash
echo "Review this code in context:

## Project Context
- Framework: Express.js with TypeScript
- Database: PostgreSQL with Sequelize ORM
- Auth: JWT with refresh tokens
- Architecture: Clean Architecture pattern

## Related Code
- UserService handles business logic
- AuthMiddleware validates tokens
- ErrorHandler provides consistent responses

## Code to Review
[Your implementation]

## Specific Concerns
- Is error handling consistent with existing code?
- Does this follow our Clean Architecture pattern?
- Are there any security issues?

Provide specific feedback." | codex exec -m gpt-5-codex --config model_reasoning_effort=high --sandbox read-only
```

### Focused Review

For specific concerns, direct Codex's attention:

```bash
echo "Security review only:

[Code here]

Focus specifically on:
- SQL injection vulnerabilities
- XSS attack vectors
- Authentication bypass possibilities
- Authorization issues
- Data exposure risks

Ignore style and minor optimizations." | codex exec -m gpt-5-codex --config model_reasoning_effort=high --sandbox read-only
```

## Troubleshooting Guide

### Issue: "Codex command not found"

**Cause:** Codex CLI not installed

**Solution:**
1. Ask user to install: `npm install -g @anthropic-ai/codex-cli`
2. Or proceed without validation
3. Inform user of reduced quality assurance

### Issue: Validation taking too long

**Cause:** Large code review or high reasoning effort

**Solution:**
1. Break review into smaller chunks
2. Reduce reasoning effort to medium or low
3. Focus review on critical sections only

### Issue: Codex gives conflicting feedback

**Cause:** Ambiguous code or multiple valid approaches

**Solution:**
1. Present both options to user
2. Ask user for preference
3. Document chosen approach
4. Proceed with user's decision

### Issue: Too many validation loops

**Cause:** Perfectionism or legitimate complex issues

**Solution:**
After 3 iterations:
1. Summarize current state
2. List remaining minor issues
3. Ask user: "Continue refining or ship current version?"
4. Respect user's decision

### Issue: Codex misunderstands context

**Cause:** Insufficient context provided

**Solution:**
1. Provide more project context
2. Include related code files
3. Explain architectural patterns
4. Reference existing implementations
5. Use `resume` to maintain conversation context

## Integration Examples

### With prompt-enhancer skill

```
User: "Add login feature"

Claude:
1. Use prompt-enhancer to clarify requirements
2. Generate detailed requirements document
3. User approves requirements
4. Create implementation plan
5. Validate plan with Codex
6. Implement and review with Codex
7. Complete
```

### With testing workflows

```
Plan → Validate →
Implement → Review →
Write Tests → Validate Tests →
Fix Issues → Re-validate →
Complete
```

## Success Checklist

Use this checklist to ensure quality:

- [ ] Plan created and validated
- [ ] Implementation follows validated plan
- [ ] Code reviewed by Codex
- [ ] Critical issues fixed
- [ ] Security concerns addressed
- [ ] Edge cases handled
- [ ] Error handling comprehensive
- [ ] Performance acceptable
- [ ] Best practices followed
- [ ] Tests written (if applicable)
- [ ] Documentation updated (if needed)

## Quick Reference Commands

```bash
# Start plan validation
echo "Plan..." | codex exec -m gpt-5-codex --config model_reasoning_effort=medium --sandbox read-only

# Code review
echo "Review..." | codex exec -m gpt-5-codex --config model_reasoning_effort=medium --sandbox read-only

# Continue session
echo "Next..." | codex exec resume --last

# Security-focused review
echo "Security review..." | codex exec -m gpt-5-codex --config model_reasoning_effort=high --sandbox read-only

# Quick validation
echo "Quick check..." | codex exec -m gpt-5-codex --config model_reasoning_effort=low --sandbox read-only

# Architectural review
echo "Architecture..." | codex exec -m gpt-5 --config model_reasoning_effort=high --sandbox read-only
```
