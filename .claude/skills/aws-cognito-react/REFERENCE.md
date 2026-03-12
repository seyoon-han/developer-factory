# AWS Cognito React Integration - Reference Guide

## Complete Implementation Example

### Project Structure
```
my-react-app/
├── public/
├── src/
│   ├── components/
│   │   ├── ProtectedRoute.js
│   │   ├── AuthCallback.js
│   │   └── UserProfile.js
│   ├── App.js
│   ├── index.js
│   └── config/
│       └── auth.js
├── .env
└── package.json
```

## Step-by-Step Implementation

### Step 1: Environment Configuration

Create `.env` file:
```env
REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-east-2.amazonaws.com/us-east-2_D5okrV4Ot
REACT_APP_COGNITO_CLIENT_ID=your_client_id_here
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_LOGOUT_URI=http://localhost:3000
REACT_APP_COGNITO_DOMAIN=https://your-domain.auth.us-east-2.amazoncognito.com
REACT_APP_COGNITO_SCOPE=phone openid email
```

### Step 2: Create Auth Configuration

Create `src/config/auth.js`:
```javascript
export const cognitoAuthConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY,
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID,
  redirect_uri: process.env.REACT_APP_REDIRECT_URI,
  response_type: "code",
  scope: process.env.REACT_APP_COGNITO_SCOPE || "phone openid email",
  onSigninCallback: () => {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  },
};

export const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN;
export const logoutUri = process.env.REACT_APP_LOGOUT_URI;
```

### Step 3: Configure Index.js

Update `src/index.js`:
```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "react-oidc-context";
import { cognitoAuthConfig } from "./config/auth";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### Step 4: Basic App Component

Update `src/App.js`:
```javascript
import React from "react";
import { useAuth } from "react-oidc-context";
import { cognitoDomain, logoutUri } from "./config/auth";
import "./App.css";

function App() {
  const auth = useAuth();

  const signOutRedirect = () => {
    const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  // Loading state
  if (auth.isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading authentication...</p>
      </div>
    );
  }

  // Error state
  if (auth.error) {
    return (
      <div className="error-container">
        <h2>Authentication Error</h2>
        <p>{auth.error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  // Authenticated state
  if (auth.isAuthenticated) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Welcome</h1>
          <button onClick={signOutRedirect} className="btn-logout">
            Sign Out
          </button>
        </header>
        
        <main className="app-main">
          <div className="user-info">
            <h2>User Information</h2>
            <p><strong>Email:</strong> {auth.user?.profile.email}</p>
            <p><strong>Name:</strong> {auth.user?.profile.name || "N/A"}</p>
            <p><strong>Phone:</strong> {auth.user?.profile.phone_number || "N/A"}</p>
          </div>

          <div className="token-info">
            <h3>Tokens (Development Only)</h3>
            <details>
              <summary>ID Token</summary>
              <pre>{auth.user?.id_token}</pre>
            </details>
            <details>
              <summary>Access Token</summary>
              <pre>{auth.user?.access_token}</pre>
            </details>
            <details>
              <summary>Refresh Token</summary>
              <pre>{auth.user?.refresh_token}</pre>
            </details>
          </div>
        </main>
      </div>
    );
  }

  // Unauthenticated state
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome</h1>
        <p>Please sign in to continue</p>
        <button onClick={() => auth.signinRedirect()} className="btn-login">
          Sign In
        </button>
      </div>
    </div>
  );
}

export default App;
```

## Advanced Patterns

### Pattern 1: Protected Route Component

Create `src/components/ProtectedRoute.js`:
```javascript
import React from "react";
import { useAuth } from "react-oidc-context";
import { Navigate } from "react-router-dom";

export const ProtectedRoute = ({ children }) => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Usage in App.js with React Router
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### Pattern 2: Auth Context Hook

Create `src/hooks/useAuthContext.js`:
```javascript
import { useAuth } from "react-oidc-context";
import { cognitoDomain, logoutUri } from "../config/auth";

export const useAuthContext = () => {
  const auth = useAuth();

  const logout = () => {
    const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const getAccessToken = () => {
    return auth.user?.access_token;
  };

  const getUserProfile = () => {
    return auth.user?.profile;
  };

  const isTokenExpired = () => {
    if (!auth.user) return true;
    const expiresAt = auth.user.expires_at;
    return Date.now() >= expiresAt * 1000;
  };

  return {
    ...auth,
    logout,
    getAccessToken,
    getUserProfile,
    isTokenExpired,
  };
};
```

### Pattern 3: API Request with Auth Token

Create `src/utils/api.js`:
```javascript
import { useAuth } from "react-oidc-context";

export const useAuthenticatedApi = () => {
  const auth = useAuth();

  const fetchWithAuth = async (url, options = {}) => {
    const token = auth.user?.access_token;

    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token expired, trigger re-authentication
      auth.signinRedirect();
      throw new Error("Authentication required");
    }

    return response;
  };

  return { fetchWithAuth };
};

// Usage example
function MyComponent() {
  const { fetchWithAuth } = useAuthenticatedApi();

  const fetchUserData = async () => {
    try {
      const response = await fetchWithAuth("https://api.example.com/user");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API error:", error);
    }
  };

  return <div>...</div>;
}
```

### Pattern 4: Automatic Token Refresh

Create `src/components/TokenRefreshHandler.js`:
```javascript
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

export const TokenRefreshHandler = ({ children }) => {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.user) return;

    const expiresAt = auth.user.expires_at * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    // Refresh 5 minutes before expiry
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000;

    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        auth.signinSilent().catch((error) => {
          console.error("Silent refresh failed:", error);
          auth.signinRedirect();
        });
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [auth]);

  return children;
};

// Usage in App.js
function App() {
  return (
    <TokenRefreshHandler>
      {/* Your app content */}
    </TokenRefreshHandler>
  );
}
```

### Pattern 5: User Profile Component

Create `src/components/UserProfile.js`:
```javascript
import React from "react";
import { useAuth } from "react-oidc-context";

export const UserProfile = () => {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return null;
  }

  const profile = auth.user?.profile;

  return (
    <div className="user-profile">
      <div className="profile-avatar">
        {profile?.picture ? (
          <img src={profile.picture} alt="Profile" />
        ) : (
          <div className="avatar-placeholder">
            {profile?.email?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="profile-info">
        <h3>{profile?.name || profile?.email}</h3>
        <p className="email">{profile?.email}</p>
        {profile?.phone_number && (
          <p className="phone">{profile.phone_number}</p>
        )}
      </div>

      <div className="profile-metadata">
        <p><strong>Email Verified:</strong> {profile?.email_verified ? "Yes" : "No"}</p>
        <p><strong>Phone Verified:</strong> {profile?.phone_number_verified ? "Yes" : "No"}</p>
        <p><strong>Sub:</strong> {profile?.sub}</p>
      </div>
    </div>
  );
};
```

## Configuration Variations

### For Production Environment

`.env.production`:
```env
REACT_APP_COGNITO_AUTHORITY=https://cognito-idp.us-east-2.amazonaws.com/us-east-2_D5okrV4Ot
REACT_APP_COGNITO_CLIENT_ID=production_client_id
REACT_APP_REDIRECT_URI=https://yourapp.com
REACT_APP_LOGOUT_URI=https://yourapp.com
REACT_APP_COGNITO_DOMAIN=https://your-domain.auth.us-east-2.amazoncognito.com
REACT_APP_COGNITO_SCOPE=phone openid email profile
```

### For Development with HTTPS

If using HTTPS in development:
```env
REACT_APP_REDIRECT_URI=https://localhost:3000
REACT_APP_LOGOUT_URI=https://localhost:3000
```

Remember to configure these URLs in Cognito app client settings.

## Troubleshooting

### Issue: Redirect URI Mismatch

**Error:** "invalid_request: Invalid redirect_uri"

**Cause:** Redirect URI not configured in Cognito

**Solution:**
1. Go to AWS Cognito Console
2. Select your User Pool
3. Navigate to App Integration > App client settings
4. Add your redirect URI to "Allowed callback URLs"
5. Add your logout URI to "Allowed sign-out URLs"

### Issue: CORS Errors

**Error:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** Cognito domain or API not configured for CORS

**Solution:**
1. Ensure requests go to correct Cognito domain
2. For API calls, configure CORS on your backend
3. Verify Cognito hosted UI domain is correct

### Issue: Infinite Redirect Loop

**Cause:** Callback not properly handled

**Solution:**
Add `onSigninCallback` to config:
```javascript
const cognitoAuthConfig = {
  // ... other config
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
```

### Issue: Token Not Refreshing

**Cause:** Silent refresh not configured or failing

**Solution:**
1. Implement TokenRefreshHandler component
2. Ensure refresh token is included in scope
3. Check token expiration times

### Issue: User Pool Domain Not Found

**Error:** "Failed to load resource: net::ERR_NAME_NOT_RESOLVED"

**Cause:** Incorrect Cognito domain

**Solution:**
1. Verify domain in Cognito Console under "App Integration > Domain name"
2. Format: `https://YOUR-DOMAIN.auth.REGION.amazoncognito.com`
3. Update REACT_APP_COGNITO_DOMAIN in .env

## Security Best Practices

### 1. Never Expose Tokens in Production

```javascript
// BAD - Don't do this in production
console.log(auth.user?.access_token);

// GOOD - Only in development
if (process.env.NODE_ENV === 'development') {
  console.log('Token:', auth.user?.access_token);
}
```

### 2. Use Environment Variables

Never hardcode sensitive values:
```javascript
// BAD
const clientId = "3njaol5nb1b94og1qgbal3an75";

// GOOD
const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
```

### 3. Implement Token Expiry Checks

```javascript
const isTokenValid = () => {
  if (!auth.user) return false;
  const expiresAt = auth.user.expires_at * 1000;
  return Date.now() < expiresAt;
};
```

### 4. Secure Token Storage

react-oidc-context uses sessionStorage by default. For more security:
```javascript
const cognitoAuthConfig = {
  // ... other config
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
};
```

## Testing Guide

### Manual Testing Checklist

- [ ] Install dependencies successfully
- [ ] Application starts without errors
- [ ] Login button visible when unauthenticated
- [ ] Clicking login redirects to Cognito hosted UI
- [ ] Can login with test credentials
- [ ] Redirects back to application after login
- [ ] User profile information displayed
- [ ] Tokens are present (check in dev mode only)
- [ ] Logout button visible when authenticated
- [ ] Clicking logout redirects to Cognito logout
- [ ] User is logged out after logout flow
- [ ] Can login again after logout

### Automated Testing Example

```javascript
// App.test.js
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from 'react-oidc-context';
import App from './App';

const mockAuthConfig = {
  authority: 'https://test-authority.com',
  client_id: 'test-client-id',
  redirect_uri: 'http://localhost:3000',
  response_type: 'code',
  scope: 'openid email',
};

test('renders login button when unauthenticated', () => {
  render(
    <AuthProvider {...mockAuthConfig}>
      <App />
    </AuthProvider>
  );
  
  const loginButton = screen.getByText(/sign in/i);
  expect(loginButton).toBeInTheDocument();
});
```

## Integration with React Router

Full example with routing:
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';

function App() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            auth.isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/profile"
          element={
            auth.isAuthenticated ? <Profile /> : <Navigate to="/login" />
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## Quick Reference

### Essential Commands

```bash
# Install
npm install react-oidc-context

# Development
npm start

# Build for production
npm run build

# Environment variables
cp .env.example .env
```

### Key Auth Methods

```javascript
auth.signinRedirect()     // Initiate login
auth.signoutRedirect()    // Initiate logout (not for Cognito)
auth.removeUser()         // Remove user from session
auth.signinSilent()       // Silent token refresh
auth.isAuthenticated      // Check auth status
auth.user?.access_token   // Get access token
auth.user?.profile        // Get user profile
```

### Cognito-Specific Logout

```javascript
const logout = () => {
  const url = `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${LOGOUT_URI}`;
  window.location.href = url;
};
```
