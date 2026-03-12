---
name: aws-cognito-react
description: Implements AWS Cognito authentication in React applications using react-oidc-context with OIDC configuration for login and logout functionality
---

# AWS Cognito React Integration

## Overview

Integrates AWS Cognito user pool authentication into React applications using the react-oidc-context library with OIDC flow.

## When to Use

- Adding authentication to React applications
- Integrating AWS Cognito user pools
- Implementing OIDC authentication flow
- Need login and logout functionality with token management

## Prerequisites

- React project initialized
- AWS Cognito user pool created
- Client ID from AWS Cognito

## Required Information from User

Before starting, ask user for:
1. Client ID (required) - from AWS Cognito user pool app client
2. Redirect URI (default: http://localhost:3000 for development)
3. Logout URI (default: same as redirect URI)
4. Scope (default: phone openid email)
5. Cognito domain for logout

## Core Implementation Steps

### Step 1: Install Dependencies

Install react-oidc-context package using npm or yarn.

### Step 2: Configure AuthProvider

Modify the main entry file (index.js or main.jsx) to wrap application with AuthProvider.

Key configuration values:
- authority: https://cognito-idp.us-east-2.amazonaws.com/us-east-2_D5okrV4Ot (static, internal)
- client_id: User provided client ID
- redirect_uri: http://localhost:3000 (for development)
- response_type: code (OAuth authorization code flow)
- scope: phone openid email 

Create auth configuration object with these values and wrap the App component with AuthProvider passing the config.

Import AuthProvider from react-oidc-context and configure with the cognitoAuthConfig object containing authority, client_id, redirect_uri, response_type, and scope.

### Step 3: Implement Authentication UI

In App.js, import useAuth hook from react-oidc-context.

Handle three authentication states:

Loading State:
- Check auth.isLoading
- Display loading message

Error State:
- Check auth.error
- Display error message

Authenticated State:
- Check auth.isAuthenticated
- Display user profile email from auth.user.profile.email
- Display tokens (id_token, access_token, refresh_token) from auth.user
- Show sign out button that calls auth.removeUser()

Unauthenticated State:
- Show sign in button that calls auth.signinRedirect()
- Show sign out button with custom Cognito logout

Custom Logout Function:
Create signOutRedirect function that constructs Cognito logout URL:
- Use Cognito domain + /logout endpoint
- Pass client_id and logout_uri as query parameters
- Redirect window.location.href to this URL

## Implementation Checklist

Before implementing, confirm with user:
- Client ID obtained from AWS Cognito
- Redirect URI configured in Cognito app client settings
- Logout URI configured in Cognito app client settings
- Cognito user pool domain noted for logout
- Required scopes identified

During implementation:
- Install react-oidc-context dependency
- Configure AuthProvider in index.js with user client ID
- Replace placeholders with actual values
- Implement authentication UI in App.js
- Test login flow
- Test logout flow
- Verify token retrieval

## Configuration Values

Static (internal use):
- Authority: https://cognito-idp.us-east-2.amazonaws.com/us-east-2_D5okrV4Ot
- Response type: code
- Default scope: phone openid email

User-provided (required):
- Client ID
- Redirect URI
- Logout URI
- Cognito domain (for logout)

## Testing Steps

After implementation:
1. Start the React application
2. Click Sign in button
3. Verify redirect to Cognito hosted UI
4. Login with test credentials
5. Verify redirect back to application
6. Confirm user profile and tokens displayed
7. Click Sign out button
8. Verify redirect to Cognito logout
9. Confirm user is logged out

## Common Issues

Issue: Invalid redirect_uri error
Solution: Ensure redirect URI is configured in Cognito app client settings

Issue: Invalid client_id error
Solution: Verify client ID is correct from Cognito user pool

Issue: CORS errors
Solution: Check Cognito domain configuration and allowed origins

Issue: Tokens not appearing
Solution: Verify scopes are properly configured in both code and Cognito

## Best Practices

- Store sensitive tokens securely (do not log in production)
- Use environment variables for client ID in production
- Implement token refresh logic for long sessions
- Add error boundaries for authentication errors
- Consider adding protected route components
- Implement automatic token renewal before expiry

## File Structure

After implementation:

src/
- index.js (or main.jsx) - AuthProvider configuration
- App.js - Authentication UI and logic
- components/ (optional)
  - ProtectedRoute.js - Protected route wrapper
  - AuthCallback.js - Callback handling component

## Next Steps Suggestions

After basic integration:
- Implement protected routes
- Add token refresh logic
- Create reusable auth components
- Add user profile management
- Implement role-based access control
- Add authentication error handling
- Create logout confirmation dialog

For detailed code examples and advanced patterns, see REFERENCE.md file.