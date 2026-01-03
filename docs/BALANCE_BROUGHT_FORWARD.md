# Balance Brought Forward (B/F) - Implementation Guide

## Overview

The Balance Brought Forward (B/F) feature allows schools to capture and track pre-existing student financial obligations from before system computerization. This ensures accurate student financial reporting, continuity of records, and transparency.

## Data Model

### Schema Definition

The `balanceBroughtForward` field has been added to the `studentInfo` subdocument in the Person model:

```typescript
// In models/Person.ts - IStudentInfo interface
balanceBroughtForward: number;

// Schema definition
balanceBroughtForward: {
    type: Number,
    default: 0,
    min: 0,
    index: true
}
```

**Field Properties:**

-   **Type**: Decimal/Number (monetary value)
-   **Default**: 0.00
-   **Nullable**: No
-   **Minimum**: 0 (non-negative)
-   **Indexed**: Yes (for query performance)

## Debt Calculation Formula

All financial calculations now follow this formula:

```
totalDebt = balanceBroughtForward + generatedCharges - payments
```

**Components:**

-   `balanceBroughtForward`: Opening balance from before computerization
-   `generatedCharges`: Current period fees from FeesConfiguration
-   `payments`: Total payments made (from FeesPayment records)

## Affected Components

### Backend APIs

| API Route                        | Change Description                                                |
| -------------------------------- | ----------------------------------------------------------------- |
| `GET /api/students/[id]/balance` | Now includes `balanceBroughtForward` in response and calculations |
| `GET /api/student-debtors`       | Outstanding balance includes B/F; added to debtor records         |
| `GET /api/students/dashboard`    | Financial data includes B/F; adjusted percentage calculations     |
| `GET /api/financial-summary`     | Total outstanding includes aggregate B/F across all students      |
| `GET /api/proprietor/dashboard`  | Outstanding receivables include B/F                               |
| `PUT /api/persons/[id]`          | Validates B/F changes; logs before/after values for audit         |
| `POST /api/persons/bulk-upload`  | Processes B/F column from CSV uploads                             |

### Frontend Components

| Component                      | Change Description                                             |
| ------------------------------ | -------------------------------------------------------------- |
| `AddPersonForm.tsx`            | New input field for Balance B/F in Student Information section |
| `PersonManagement.tsx`         | CSV parser recognizes B/F column headers                       |
| `StudentDebtorsManagement.tsx` | Displays B/F in fee breakdown with orange highlight            |
| `FeesPaymentRecording.tsx`     | Shows B/F when viewing student balance                         |
| `StudentDashboard.tsx`         | Displays B/F in fee breakdown section                          |

### Type Definitions

| Type File          | Change                                                      |
| ------------------ | ----------------------------------------------------------- |
| `types/payment.ts` | Added `balanceBroughtForward` to `StudentBalance` interface |

## Data Entry

### Single Student Entry

When manually adding a student through the form wizard:

1. Navigate to **Step 4: Role & Details**
2. Select **Student** as the person category
3. In the **Student Information** panel, find the **Financial Opening Balance** section
4. Enter the **Balance Brought Forward (B/F)** value
5. The field accepts decimal values (e.g., 500.00)
6. Helper text explains the field's purpose

### Bulk Upload (CSV)

**Supported Column Names** (case-insensitive):

-   `BalanceBroughtForward`
-   `Balance Brought Forward`
-   `BalanceBF`
-   `Balance B/F`
-   `Balance_BF`
-   `OpeningBalance`
-   `Opening Balance`

**Rules:**

-   Applied only to records with `Category = student`
-   Must be non-negative decimal
-   Defaults to 0.00 if not provided
-   Ignored for non-student records

**Example CSV:**

```csv
FirstName,Username,Password,Category,BalanceBroughtForward
John,jdoe,Pass123!,student,500.00
Jane,jsmith,Pass123!,student,0.00
Mike,mbrown,Pass123!,student,1250.50
```

## UI Display

### Visual Indicators

The Balance B/F is displayed with:

-   **Orange color** (text-orange-600) to distinguish from regular fees
-   **Info icon** (pi-info-circle) with tooltip explaining its purpose
-   **Label**: "Balance B/F" or "Balance B/F (Opening)"

### Display Locations

1. **Student Debtors Management**: In fee breakdown card
2. **Fee Payment Recording**: In balance summary panel
3. **Student Dashboard**: In fee breakdown list
4. **Financial Reports**: Included in total calculations

## Access Control & Security

### Edit Permissions

The `balanceBroughtForward` field should only be editable by:

-   **Admin** role
-   **Finance Officer** role

Students can **view** their Balance B/F but cannot modify it.

### Audit Logging

All changes to `balanceBroughtForward` are logged with:

-   Previous value (before change)
-   New value (after change)
-   Timestamp
-   User who made the change
-   Activity category: `crud`, action type: `update`

Console log example:

```
[AUDIT] Balance B/F change for student 507f1f77bcf86cd799439011: 0 -> 500
```

## Validation Rules

1. **Non-negative**: Value must be >= 0
2. **Number type**: Must be a valid decimal number
3. **Student-only**: Field only applies to Person records with `personCategory = 'student'`
4. **No auto-modification**: System never silently modifies this value

## Migration & Backward Compatibility

### Existing Students

-   All existing students default to `balanceBroughtForward = 0.00`
-   No recalculation of historical transactions
-   B/F applies only as an opening position

### Database Migration

No explicit migration required - Mongoose schema defaults handle new documents:

```javascript
balanceBroughtForward: {
    type: Number,
    default: 0,
    min: 0
}
```

For existing documents, queries return `undefined` which is handled as 0:

```typescript
const balanceBF = student.studentInfo?.balanceBroughtForward || 0;
```

## Testing Checklist

-   [ ] Create student with B/F via form - verify value saved
-   [ ] Edit student B/F - verify audit log created
-   [ ] Bulk upload students with B/F column - verify values applied
-   [ ] Bulk upload without B/F column - verify defaults to 0
-   [ ] View student debtors - verify B/F displayed in breakdown
-   [ ] View student dashboard - verify B/F in fee breakdown
-   [ ] Record payment - verify B/F shown in balance
-   [ ] Check financial summary - verify aggregate B/F included
-   [ ] Attempt negative B/F - verify validation error
-   [ ] Check percentage calculations include B/F in total

## Related Documentation

-   [Person Management Guide](./PERSON_MANAGEMENT_GUIDE.md)
-   [CSV Template Documentation](./PERSON_CSV_TEMPLATE.md)
-   [Financial System Documentation](./FINANCIAL_SYSTEM_COMPLETE.md)
-   [Activity Logging System](./ACTIVITY_LOGGING_SYSTEM.md)

---

**Implementation Date**: January 2, 2026  
**Version**: 1.0  
**Author**: System Implementation Team
