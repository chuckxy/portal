# Profile Management System

## Overview

A comprehensive profile editing system that allows users to update their personal information, contact details, medical information, professional details, and security settings.

## Components Created

### 1. ProfileEditForm Component (`/components/ProfileEditForm.tsx`)

A fully-featured profile editing component with the following tabs:

#### **Basic Information Tab**

-   Photo upload (max 5MB)
-   First Name, Middle Name, Last Name
-   Date of Birth
-   Gender selection
-   Biography/About section

#### **Contact Information Tab**

-   Mobile Phone
-   Home Phone
-   Email Address
-   Primary Language
-   Secondary Language

#### **Medical & Emergency Tab**

-   Blood Group selection
-   Allergies (chips input)
-   Chronic Conditions (chips input)
-   Emergency Contact:
    -   Name
    -   Relationship
    -   Phone Number
    -   Alternate Phone

#### **Professional Tab** (For non-students)

-   Marital Status
-   TIN Number
-   SSNIT Number
-   Bank Information:
    -   Account Name
    -   Account Number
    -   Branch

#### **Security Tab**

-   Password Change:
    -   Current Password
    -   New Password
    -   Confirm Password
-   Account Deletion (with confirmation dialog)

## API Routes Created

### 1. Profile Update - `PATCH /api/persons/[id]`

-   Partial updates for profile information
-   Validates email uniqueness
-   Prevents username and password changes (use dedicated endpoints)
-   Returns updated person data

### 2. Password Change - `POST /api/persons/[id]/change-password`

-   Validates current password
-   Requires minimum 6 characters for new password
-   Hashes password with bcrypt
-   Provides secure password update

## Page Route

### Profile Page - `/profile`

-   Located at: `app/(main)/profile/page.tsx`
-   Protected route (requires authentication)
-   Loads ProfileEditForm with current user's data

## Features

✅ **Photo Upload** - Upload and update profile picture
✅ **Form Validation** - Required field validation
✅ **Real-time Updates** - Changes reflected immediately
✅ **Security** - Separate password change endpoint
✅ **Error Handling** - User-friendly error messages
✅ **Loading States** - Spinners and disabled states during operations
✅ **Success Feedback** - Toast notifications for all actions
✅ **Responsive Design** - Mobile-friendly layout
✅ **Role-based Tabs** - Shows relevant tabs based on person category
✅ **Account Deletion** - With confirmation dialog
✅ **Context Integration** - Updates auth context after profile changes

## Integration

### Navigation

Profile link added to AppTopbar profile menu:

-   Icon: User icon
-   Label: "My Profile"
-   Route: `/profile`

### Access

Users can access their profile from:

1. Top navigation bar → Profile icon → "My Profile"
2. Direct URL: `/profile`

## Usage Example

```tsx
// Import in any page
import ProfileEditForm from '@/components/ProfileEditForm';

// Use with user ID and category
<ProfileEditForm userId={user.id} personCategory={user.personCategory} />;
```

## Security Considerations

1. **Password Changes** - Require current password verification
2. **Unique Constraints** - Email uniqueness validated
3. **No Direct Password Updates** - Password changes only through dedicated endpoint
4. **No Username Changes** - Username locked after creation
5. **Account Deletion** - Requires explicit confirmation

## Validation Rules

-   First Name: Required
-   Last Name: Required
-   Password: Minimum 6 characters
-   Email: Valid email format, unique
-   Photo: Maximum 5MB

## Future Enhancements

-   [ ] Two-factor authentication
-   [ ] Activity log
-   [ ] Data export
-   [ ] Profile visibility settings
-   [ ] Session management
-   [ ] Email verification for changes
