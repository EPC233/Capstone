# UI - Fitness Tracker

React web application for managing courses, modules, posts, and quizzes. Built with Vite, React, Mantine UI, and TypeScript.

## Features

- **Authentication**: Secure login with token-based authentication
- **Course Management**: Create and manage courses, modules, and posts
- **Content Editing**: Rich text editor for post content
- **Quiz Management**: Create and manage quizzes with multiple question types
- **User Management**: Admin interface for managing users and groups
- **Progress Tracking**: Track user progress through courses

## Tech Stack

- **Vite**: Build tool and dev server
- **React**: UI framework
- **Mantine UI**: Component library
- **TypeScript**: Type safety
- **React Router**: Client-side routing
- **Axios**: HTTP client

## Prerequisites

- Node.js 18.17.0 (see `.nvmrc`)
- npm or yarn

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the `ui/` directory:
   ```
   VITE_API_URL=http://localhost:8000
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Testing

This project uses **Vitest** for unit testing, focusing on pure utility functions and one example component test.

### Philosophy

- **Test pure functions first** - Easy to write, fast to run, catch real bugs
- **One component example** - Shows students how to test React components
- **Minimal but extensible** - Start small, grow as needed
- **Real software focus** - Tests that actually catch bugs, not just examples

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (default)
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Structure

Tests are located in `__tests__` directories next to the code they test:

```
ui/
├── src/
│   ├── utils/
│   │   ├── __tests__/
│   │   │   ├── api.test.ts           # Tests for getAuthHeaders() and getApiUrl()
│   │   │   └── userUtils.test.ts     # Tests for getAvatarUrl() and getRoleBadgeColor()
│   │   ├── api.ts
│   │   └── userUtils.ts
│   └── components/
│       └── ui/
│           ├── __tests__/
│           │   └── LoadingSpinner.test.tsx  # Example component test
│           └── LoadingSpinner.tsx
```

### What We Test

- **Pure utility functions** - API helpers, URL construction, type conversion
- **One simple component** - LoadingSpinner as an example of component testing

### What We Don't Test (For Now)

- Complex components (ProtectedRoute, LoginPage, etc.)
- Context providers
- API integration (use backend tests for that)
- E2E flows

### Adding New Tests

1. Create a `__tests__` directory next to your file
2. Create a test file: `myUtility.test.ts` or `MyComponent.test.tsx`
3. Write tests using Vitest's `describe` and `it` blocks
4. Run `npm test` to verify

Example for utility function:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myUtility';

describe('myUtility', () => {
    it('should handle case X', () => {
        expect(myFunction('input')).toBe('expected');
    });
});
```

Example for component:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import MyComponent from '../MyComponent';
import { theme } from '../../../theme';

describe('MyComponent', () => {
    it('should render correctly', () => {
        render(
            <MantineProvider theme={theme}>
                <MyComponent />
            </MantineProvider>
        );
        expect(screen.getByText('Expected text')).toBeInTheDocument();
    });
});
```

## Development Workflow

1. **Start backend server**: Ensure the FastAPI backend is running
2. **Start dev server**: `npm run dev`
3. **Make changes**: Files are hot-reloaded automatically
4. **Run tests**: `npm test` (runs in watch mode)

## Project Structure

```
ui/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   └── ...             # Feature components
│   ├── contexts/           # React contexts
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   ├── utils/              # Utility functions
│   ├── designTokens.ts     # Design system tokens
│   └── theme.ts            # Mantine theme
├── public/                  # Static assets
└── package.json
```

## Design System

The app uses **Mantine UI** with a custom theme:

- **Primary Color**: `#009EB1` (Cyan-blue)
- **Secondary Color**: `#B44985` (Pink-magenta)
- **Error**: `#DC2626` (Red)
- **Success**: `#10B981` (Green)

Theme configuration is in `theme.ts` and design tokens in `designTokens.ts`.

## License

ISC

