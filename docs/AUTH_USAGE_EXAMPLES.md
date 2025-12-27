# Authentication System Usage Examples

## Overview
The authentication system provides state-wide auth context management for the school management system. It's modeled after a modern context-based authentication pattern.

## Files Created

1. **`types/auth.ts`** - TypeScript types and interfaces
2. **`context/AuthContext.tsx`** - Main auth context provider
3. **`lib/services/LocalStorageService.ts`** - Browser storage management
4. **`components/auth/ProtectedRoute.tsx`** - Component wrapper for protected routes
5. **`hooks/useRequireAuth.ts`** - Hook for page-level auth requirements
6. **`app/(full-page)/unauthorized/page.tsx`** - Unauthorized access page

## Usage Examples

### 1. Using the Auth Context in Components

```typescript
'use client';

import { useAuth } from '@/context/AuthContext';

const DashboardPage = () => {
    const { user, isAuthenticated, isLoading, logout } = useAuth();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <div>Please login</div>;
    }

    return (
        <div>
            <h1>Welcome, {user?.fullName}</h1>
            <p>Role: {user?.personCategory}</p>
            <button onClick={logout}>Logout</button>
        </div>
    );
};
```

### 2. Protecting Routes with Component Wrapper

```typescript
'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

const AdminPage = () => {
    return (
        <ProtectedRoute allowedRoles={['admin', 'proprietor']}>
            <div>
                <h1>Admin Dashboard</h1>
                {/* Admin-only content */}
            </div>
        </ProtectedRoute>
    );
};

export default AdminPage;
```

### 3. Using the useRequireAuth Hook

```typescript
'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';

const TeacherDashboard = () => {
    const { user, isAuthenticated, isLoading } = useRequireAuth({
        allowedRoles: ['teacher', 'headmaster']
    });

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Teacher Dashboard</h1>
            <p>Welcome, {user?.fullName}</p>
        </div>
    );
};
```

### 4. Role-Based UI Rendering

```typescript
'use client';

import { useAuth } from '@/context/AuthContext';

const Navigation = () => {
    const { user, isAuthenticated } = useAuth();

    return (
        <nav>
            {isAuthenticated && (
                <>
                    <a href="/">Dashboard</a>

                    {/* Show admin links only to admins */}
                    {user?.personCategory === 'admin' && (
                        <a href="/admin">Admin Panel</a>
                    )}

                    {/* Show teacher links to teachers and headmasters */}
                    {['teacher', 'headmaster'].includes(user?.personCategory || '') && (
                        <a href="/classes">My Classes</a>
                    )}

                    {/* Show student links only to students */}
                    {user?.personCategory === 'student' && (
                        <a href="/grades">My Grades</a>
                    )}
                </>
            )}
        </nav>
    );
};
```

### 5. Manual Login/Logout

```typescript
'use client';

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

const CustomLoginForm = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const response = await login({
            username,
            password,
            rememberMe: true
        });

        if (response.success) {
            // Login successful, will redirect automatically
            console.log('Logged in as:', response.user);
        } else {
            setError(response.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
            />
            {error && <div>{error}</div>}
            <button type="submit">Login</button>
        </form>
    );
};
```

### 6. Updating User Profile

```typescript
'use client';

import { useAuth } from '@/context/AuthContext';

const ProfilePage = () => {
    const { user, updateProfile } = useAuth();

    const handleUpdatePhoto = async (photoUrl: string) => {
        try {
            await updateProfile({
                photoLink: photoUrl
            });
            console.log('Profile updated successfully');
        } catch (error) {
            console.error('Failed to update profile', error);
        }
    };

    return (
        <div>
            <h1>Profile</h1>
            <img src={user?.photoLink} alt="Profile" />
            {/* Profile update form */}
        </div>
    );
};
```

### 7. Checking Multiple Roles

```typescript
'use client';

import { useAuth } from '@/context/AuthContext';

const ReportsPage = () => {
    const { user } = useAuth();

    const canViewReports = ['proprietor', 'headmaster', 'admin'].includes(
        user?.personCategory || ''
    );

    if (!canViewReports) {
        return <div>You don't have access to reports</div>;
    }

    return (
        <div>
            <h1>School Reports</h1>
            {/* Reports content */}
        </div>
    );
};
```

## Available User Roles

- `proprietor` - School owner
- `headmaster` - School principal
- `teacher` - Teaching staff
- `finance` - Finance officer
- `student` - Student
- `parent` - Parent/Guardian
- `librarian` - Library staff
- `admin` - System administrator

## Auth Context Methods

- **`login(credentials)`** - Authenticate user
- **`logout()`** - Sign out user
- **`updateProfile(data)`** - Update user information
- **`refreshUser()`** - Refresh user data from storage

## Auth State Properties

- **`user`** - Current user object (null if not authenticated)
- **`isAuthenticated`** - Boolean indicating auth status
- **`isLoading`** - Boolean indicating if auth is being initialized

## Tips

1. Always check `isLoading` before checking `isAuthenticated`
2. Use `ProtectedRoute` for entire pages
3. Use `useRequireAuth` hook for component-level protection
4. Use role arrays for multi-role access: `allowedRoles={['teacher', 'admin']}`
5. The `rememberMe` option keeps user logged in for 7 days
