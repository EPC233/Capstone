# Minimal Test Suite for UI

This document outlines a minimal but meaningful test suite for the UI. The goal is to test critical user flows and key components without overwhelming students.

## Test Framework Setup

We'll use **Vitest** (works seamlessly with Vite) and **React Testing Library** (best practices for React testing).

### Installation

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/ui
```

### Configuration

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

## Minimal Test Suite

### 1. Utility Functions (Highest Priority)

**File: `src/utils/__tests__/api.test.ts`**

Test the core API utilities that everything depends on:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAuthHeaders, getApiUrl } from '../api';

describe('API Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getAuthHeaders', () => {
    it('should include Content-Type by default', () => {
      const headers = getAuthHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should include Authorization when token exists', () => {
      localStorage.setItem('auth_token', 'test-token');
      const headers = getAuthHeaders();
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should not include Authorization when no token', () => {
      const headers = getAuthHeaders();
      expect(headers['Authorization']).toBeUndefined();
    });

    it('should exclude Content-Type when requested', () => {
      const headers = getAuthHeaders(false);
      expect(headers['Content-Type']).toBeUndefined();
    });
  });

  describe('getApiUrl', () => {
    it('should default to localhost:8000/api', () => {
      const url = getApiUrl();
      expect(url).toBe('http://localhost:8000/api');
    });

    it('should append /api if not present', () => {
      // Mock env variable
      import.meta.env.VITE_API_URL = 'http://example.com';
      const url = getApiUrl();
      expect(url).toBe('http://example.com/api');
    });

    it('should not duplicate /api', () => {
      import.meta.env.VITE_API_URL = 'http://example.com/api';
      const url = getApiUrl();
      expect(url).toBe('http://example.com/api');
    });
  });
});
```

### 2. ProtectedRoute Component (High Priority)

**File: `src/components/auth/__tests__/ProtectedRoute.test.tsx`**

Test authentication and authorization logic:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock the API
vi.mock('../../../utils/api', () => ({
  getApiUrl: () => 'http://localhost:8000/api',
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should redirect to login when not authenticated', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should redirect to login (check for Navigate component)
    // In a real test, you'd check the URL or mock useNavigate
  });

  it('should render children when authenticated', async () => {
    // Mock successful authentication
    localStorage.setItem('auth_token', 'test-token');
    
    // Mock fetch for user info
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        username: 'testuser',
        role: { name: 'user' },
      }),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Wait for auth check to complete
    await screen.findByText('Protected Content');
  });

  it('should redirect to unauthorized when role does not match', async () => {
    localStorage.setItem('auth_token', 'test-token');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        username: 'testuser',
        role: { name: 'user' },
      }),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute requiredRole="admin">
            <div>Admin Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should redirect to unauthorized
    // Check for Navigate to /unauthorized
  });
});
```

### 3. Login Page (High Priority)

**File: `src/pages/auth/__tests__/LoginPage.test.tsx`**

Test the login flow:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { AuthProvider } from '../../../contexts/AuthContext';

vi.mock('../../../utils/api', () => ({
  getApiUrl: () => 'http://localhost:8000/api',
}));

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('should render login form', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show error on failed login', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should redirect on successful login', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'test-token' }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        username: 'testuser',
        role: { name: 'user' },
      }),
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Should redirect to home
    await waitFor(() => {
      expect(localStorage.getItem('auth_token')).toBe('test-token');
    });
  });
});
```

### 4. AuthContext (Medium Priority)

**File: `src/contexts/__tests__/AuthContext.test.tsx`**

Test authentication state management:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

vi.mock('../utils/api', () => ({
  getApiUrl: () => 'http://localhost:8000/api',
}));

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('should provide authentication state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.userInfo).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('should login and set token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        username: 'testuser',
        role: { name: 'user' },
      }),
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.login('test-token');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.userInfo?.username).toBe('testuser');
    });
  });

  it('should logout and clear token', async () => {
    localStorage.setItem('auth_token', 'test-token');
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('should check role correctly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1,
        username: 'admin',
        role: { name: 'admin' },
      }),
    });

    localStorage.setItem('auth_token', 'test-token');

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasRole('admin')).toBe(true);
    expect(result.current.hasRole('user')).toBe(false);
    expect(result.current.hasAnyRole(['admin', 'manager'])).toBe(true);
  });
});
```

### 5. Simple Component Test (Low Priority - Example)

**File: `src/components/ui/__tests__/LoadingSpinner.test.tsx`**

A simple component to demonstrate testing patterns:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render loading message', () => {
    render(<LoadingSpinner message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should render default message when none provided', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

## Test Organization

```
src/
├── test/
│   └── setup.ts                    # Test configuration
├── utils/
│   └── __tests__/
│       └── api.test.ts             # API utility tests
├── contexts/
│   └── __tests__/
│       └── AuthContext.test.tsx    # Auth context tests
├── components/
│   ├── auth/
│   │   └── __tests__/
│   │       └── ProtectedRoute.test.tsx
│   └── ui/
│       └── __tests__/
│           └── LoadingSpinner.test.tsx
└── pages/
    └── auth/
        └── __tests__/
            └── LoginPage.test.tsx
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## What NOT to Test (For Minimal Suite)

- **Visual styling** - Don't test CSS classes or colors
- **Third-party libraries** - Don't test Mantine components themselves
- **Complex integration flows** - Focus on unit tests for now
- **E2E scenarios** - Save for later phases

## Why This Minimal Set?

1. **Utility functions** - Core functionality everything depends on
2. **ProtectedRoute** - Critical security component
3. **LoginPage** - Primary user entry point
4. **AuthContext** - Central state management
5. **One simple component** - Demonstrates testing patterns

This gives students:
- ✅ Experience with testing setup
- ✅ Understanding of test structure
- ✅ Coverage of critical paths
- ✅ Examples they can extend
- ✅ Not overwhelming (5 test files)

## Next Steps (For Students)

Once comfortable with these tests, students can:
1. Add tests for other pages (UsersPage, GroupsPage, etc.)
2. Add tests for form validation
3. Add tests for error handling
4. Add integration tests for user flows
5. Add E2E tests with Playwright or Cypress

