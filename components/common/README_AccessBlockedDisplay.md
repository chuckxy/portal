# AccessBlockedDisplay Component

A reusable, role-agnostic UI component for handling all blocked-access states across protected pages and dashboards.

## Features

-   ✅ **Unified Access Control UI** - Single component for all blocked-access scenarios
-   ✅ **Role-Agnostic** - Works for any role (teacher, admin, student, librarian, etc.)
-   ✅ **Mobile-First Design** - Responsive, centered, and touch-friendly
-   ✅ **Clear Communication** - Friendly titles and messages explaining why access is restricted
-   ✅ **Flexible Actions** - Built-in login, back, and home buttons + custom actions
-   ✅ **Visual Feedback** - Color-coded icons and severity indicators
-   ✅ **Zero Business Logic Changes** - Pure UI component, preserves existing permission rules

## Usage

### Basic Example (Teacher Dashboard)

```tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import TeacherDashboard from '@/components/features/dashboard/TeacherDashboard';
import AccessBlockedDisplay from '@/components/common/AccessBlockedDisplay';

export default function TeacherDashboardPage() {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingSpinner />;

    // Not logged in
    if (!user) {
        return <AccessBlockedDisplay reason="not-logged-in" showLoginButton={true} loginRedirect="/auth/login" />;
    }

    // Wrong role
    if (user.personCategory !== 'teacher') {
        return <AccessBlockedDisplay reason="unauthorized-role" requiredRole="teacher" currentRole={user.personCategory} />;
    }

    // Invalid session
    if (!user.id) {
        return <AccessBlockedDisplay reason="invalid-session" showLoginButton={true} />;
    }

    return <TeacherDashboard teacherId={user.id} />;
}
```

### Admin Dashboard Example

```tsx
if (!user) {
    return <AccessBlockedDisplay reason="not-logged-in" showLoginButton={true} />;
}

if (user.personCategory !== 'admin') {
    return <AccessBlockedDisplay reason="unauthorized-role" requiredRole="admin" currentRole={user.personCategory} />;
}
```

### Student Portal Example

```tsx
if (!user) {
    return <AccessBlockedDisplay reason="not-logged-in" showLoginButton={true} />;
}

if (user.personCategory !== 'student') {
    return <AccessBlockedDisplay reason="unauthorized-role" requiredRole="student" currentRole={user.personCategory} title="Student Portal Access Only" message="This portal is exclusively for enrolled students." />;
}
```

### Librarian Dashboard Example

```tsx
if (!user || user.personCategory !== 'librarian') {
    return <AccessBlockedDisplay reason="unauthorized-role" requiredRole="librarian" currentRole={user?.personCategory} showLoginButton={!user} />;
}
```

### Custom Messages and Actions

```tsx
<AccessBlockedDisplay
    reason="unauthorized-role"
    title="Premium Feature"
    message="This feature is only available to premium members. Upgrade your account to access advanced analytics."
    customAction={{
        label: 'Upgrade Now',
        icon: 'pi pi-star',
        action: () => router.push('/upgrade')
    }}
/>
```

### Missing Data Example

```tsx
if (!user.schoolSite) {
    return (
        <AccessBlockedDisplay
            reason="missing-data"
            title="Setup Required"
            message="Your profile is incomplete. Please contact your administrator to assign you to a school site."
            showBackButton={false}
            customAction={{
                label: 'Contact Support',
                icon: 'pi pi-envelope',
                action: () => (window.location.href = 'mailto:support@school.edu')
            }}
        />
    );
}
```

## API Reference

### Props

| Prop              | Type                                                                            | Required | Default       | Description                           |
| ----------------- | ------------------------------------------------------------------------------- | -------- | ------------- | ------------------------------------- |
| `reason`          | `'not-logged-in' \| 'unauthorized-role' \| 'invalid-session' \| 'missing-data'` | ✅       | -             | The type of access block              |
| `requiredRole`    | `string`                                                                        | ❌       | -             | The role required to access the page  |
| `currentRole`     | `string`                                                                        | ❌       | -             | The current user's role (for context) |
| `title`           | `string`                                                                        | ❌       | Auto          | Custom title (overrides default)      |
| `message`         | `string`                                                                        | ❌       | Auto          | Custom message (overrides default)    |
| `showLoginButton` | `boolean`                                                                       | ❌       | `false`       | Show "Go to Login" button             |
| `showBackButton`  | `boolean`                                                                       | ❌       | `true`        | Show "Go Back" button                 |
| `loginRedirect`   | `string`                                                                        | ❌       | `/auth/login` | Custom login page URL                 |
| `customAction`    | `object`                                                                        | ❌       | -             | Custom action button                  |

### Custom Action Object

```typescript
{
    label: string;      // Button text
    icon?: string;      // PrimeReact icon class (e.g., 'pi pi-check')
    action: () => void; // Click handler
}
```

## Reason Types

### 1. `not-logged-in`

**When to use:** User is not authenticated  
**Default UI:**

-   🟠 Orange warning icon
-   "Authentication Required" title
-   Shows login button if `showLoginButton={true}`

### 2. `unauthorized-role`

**When to use:** User lacks required role/permission  
**Default UI:**

-   🔴 Red ban icon
-   "Access Denied" title
-   Shows required role badge when `requiredRole` is provided

### 3. `invalid-session`

**When to use:** User session data is corrupt/missing  
**Default UI:**

-   🔴 Red warning triangle
-   "Session Error" title
-   Recommends re-login

### 4. `missing-data`

**When to use:** Required user data is unavailable  
**Default UI:**

-   🔵 Blue info icon
-   "Missing Information" title
-   Suggests contacting support

## Design Principles

### Mobile-First

-   Responsive width (max 600px on desktop, 100% on mobile)
-   Touch-friendly button sizes
-   Readable text sizes (responsive)
-   Centered layout with proper padding

### Visual Hierarchy

1. **Icon** - Large, color-coded, immediately recognizable
2. **Title** - Bold, concise, explains the situation
3. **Message** - Detailed explanation in plain language
4. **Role Badge** - Contextual info when relevant
5. **Actions** - Clear next steps

### Accessibility

-   Semantic HTML structure
-   High contrast colors
-   Icon + text labels
-   Keyboard navigation support
-   Screen reader friendly

## Migration Guide

### Before (Old Pattern)

```tsx
if (!user) {
    return (
        <div className="grid">
            <div className="col-12">
                <Message severity="warn" text="Please log in" />
            </div>
        </div>
    );
}

if (user.role !== 'teacher') {
    return (
        <div className="grid">
            <div className="col-12">
                <Message severity="error" text="Access denied" />
            </div>
        </div>
    );
}
```

### After (New Pattern)

```tsx
if (!user) {
    return <AccessBlockedDisplay reason="not-logged-in" showLoginButton={true} />;
}

if (user.role !== 'teacher') {
    return <AccessBlockedDisplay reason="unauthorized-role" requiredRole="teacher" currentRole={user.role} />;
}
```

## Benefits

### For Developers

-   **Single Source of Truth** - One component for all access blocks
-   **Less Code** - Reduce boilerplate by 60-80%
-   **Consistent UX** - Same look/feel across all pages
-   **Easy Customization** - Override defaults when needed
-   **Type Safe** - Full TypeScript support

### For Users

-   **Clear Communication** - Know exactly why access is blocked
-   **Guided Actions** - Obvious next steps (login, go back, etc.)
-   **Professional Look** - Polished, modern design
-   **Better UX** - Centered, mobile-friendly, easy to read

### For Product

-   **Brand Consistency** - Uniform blocked-access experience
-   **Reduced Support** - Self-explanatory error states
-   **Higher Confidence** - Users understand system behavior
-   **Better Metrics** - Track access blocks systematically

## Advanced Patterns

### Multi-Condition Checks

```tsx
const getBlockReason = () => {
    if (!user) return 'not-logged-in';
    if (!user.id) return 'invalid-session';
    if (!user.schoolSite) return 'missing-data';
    if (user.personCategory !== 'teacher') return 'unauthorized-role';
    return null;
};

const blockReason = getBlockReason();

if (blockReason) {
    return (
        <AccessBlockedDisplay reason={blockReason} requiredRole={blockReason === 'unauthorized-role' ? 'teacher' : undefined} currentRole={user?.personCategory} showLoginButton={blockReason === 'not-logged-in' || blockReason === 'invalid-session'} />
    );
}
```

### Conditional Customization

```tsx
const isStudent = user?.personCategory === 'student';

return (
    <AccessBlockedDisplay
        reason="unauthorized-role"
        requiredRole="teacher"
        currentRole={user?.personCategory}
        message={isStudent ? 'Students cannot access the teacher dashboard. Visit the Student Portal instead.' : 'This dashboard is restricted to teaching staff only.'}
        customAction={
            isStudent
                ? {
                      label: 'Go to Student Portal',
                      icon: 'pi pi-book',
                      action: () => router.push('/students')
                  }
                : undefined
        }
    />
);
```

## Testing

### Visual Testing Checklist

-   [ ] Icon displays correctly for each reason type
-   [ ] Title and message are readable on mobile
-   [ ] Buttons are accessible and properly spaced
-   [ ] Role badge shows when required
-   [ ] Card is centered and responsive
-   [ ] Colors match severity levels

### Functional Testing

-   [ ] Login button navigates correctly
-   [ ] Back button returns to previous page
-   [ ] Home button goes to homepage
-   [ ] Custom actions execute properly
-   [ ] All props work as documented

## Related Components

-   `useAuth()` - Authentication hook
-   `ProgressSpinner` - Loading states
-   `Message` - Legacy inline messages (being replaced)

## Future Enhancements

-   [ ] Animation on mount
-   [ ] Dark mode support
-   [ ] Internationalization (i18n)
-   [ ] Analytics tracking
-   [ ] Custom icon support
-   [ ] Multiple custom actions
-   [ ] Toast notification integration

---

**Component Location:** `/components/common/AccessBlockedDisplay.tsx`  
**Created:** January 2, 2026  
**Version:** 1.0.0
