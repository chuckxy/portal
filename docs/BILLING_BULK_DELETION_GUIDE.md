# Student Billing Bulk Deletion - Complete Guide

## Overview

This feature allows you to safely delete all billing records for a specific academic period and regenerate them with updated fee configurations. This is crucial when fee amounts change after initial bill generation.

## When to Use This Feature

✅ **Safe to Use When:**

-   Fee configurations changed after initial generation
-   Bills were generated with wrong fee amounts
-   Testing billing system before go-live
-   NO payments have been made yet

⚠️ **Use with Extreme Caution When:**

-   Some payments have already been recorded
-   Students have made partial payments
-   Term is already in progress

❌ **DO NOT USE:**

-   At end of term with many payments
-   Without database backup
-   Without informing stakeholders
-   If you're unsure about implications

## How It Works

### Architecture

**Endpoint**: `POST /api/student-billing/bulk-delete`

**Process Flow:**

```
1. Validate input parameters
2. Find all billing records matching criteria
3. Check for payments (safety check)
4. Update linked records (previous/next terms)
5. Delete billing records
6. Optimize database (cleanup orphaned references)
7. Return detailed results
```

### Safety Mechanisms

#### 1. Payment Check

-   Automatically detects bills with payments
-   **Blocks deletion** if payments exist (unless force=true)
-   Shows detailed list of bills with payments

#### 2. Linked Records Management

-   Updates `carriedForwardFrom` references
-   Updates `carriedForwardTo` references
-   Resets balance brought forward in next term
-   Marks previous term as current again

#### 3. Database Optimization

-   Finds orphaned payment records
-   Fixes broken forward/backward links
-   Ensures data integrity

## Step-by-Step Usage

### Workflow: Fixing Fee Configuration After Generation

```
┌─────────────────────────────────────────────────────┐
│ Step 1: Realize fee config was wrong               │
├─────────────────────────────────────────────────────┤
│ Form 1A: Generated at GHS 1,000                     │
│ Should be: GHS 1,200                                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: Verify no payments made                    │
├─────────────────────────────────────────────────────┤
│ • Check with finance department                     │
│ • Run payment reports                               │
│ • Confirm with school administration                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Update fee configuration                   │
├─────────────────────────────────────────────────────┤
│ • Go to Fee Configuration                           │
│ • Update Form 1A fees to GHS 1,200                  │
│ • Save changes                                      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Step 4: Delete existing bills                      │
├─────────────────────────────────────────────────────┤
│ • Go to Billing Management                          │
│ • Select Site, Year, Term                           │
│ • (Optional) Select specific class                  │
│ • Click "Delete Bills"                              │
│ • Confirm deletion                                  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Step 5: Regenerate with new fees                   │
├─────────────────────────────────────────────────────┤
│ • Click "Generate Bills"                            │
│ • New bills created with GHS 1,200                  │
│ • Verify with "Verify Coverage"                     │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│ Step 6: Confirm success                            │
├─────────────────────────────────────────────────────┤
│ • Check sample student bills                        │
│ • Verify amounts are correct                        │
│ • Review class-by-class breakdown                   │
│ • Inform relevant parties                           │
└─────────────────────────────────────────────────────┘
```

### UI Instructions

#### 1. Navigate to Billing Management

```
Finance → Billing Management
```

#### 2. Set Filters

-   **School Site**: Select the site
-   **Academic Year**: e.g., 2025-2026
-   **Academic Term**: e.g., Term 1
-   **Class** (Optional): Select specific class or leave for all

#### 3. Delete Bills

1. Click **"Delete Bills"** button (red button with trash icon)
2. Read the warning dialog carefully:

    ```
    ⚠️ WARNING: This will DELETE all billing records for 2025-2026 Term 1.

    This action cannot be undone!

    Only proceed if NO payments have been made yet.

    Continue?
    ```

3. Click **"Accept"** to proceed or **"Reject"** to cancel

#### 4. Review Results

Success message shows:

```
Successfully deleted X billing records

Deleted: X
Errors: 0

Database Optimization:
- Orphaned payments: 0
- Broken links fixed: 2
```

#### 5. Regenerate Bills

1. Click **"Generate Bills"**
2. Confirm generation
3. Review class-by-class results
4. Use **"Verify Coverage"** to confirm 100% coverage

## API Reference

### Request

```typescript
POST /api/student-billing/bulk-delete

Body:
{
    schoolSiteId: string;        // Required
    academicYear: string;        // Required (e.g., "2025-2026")
    academicTerm: number;        // Required (1, 2, or 3)
    classId?: string;            // Optional - specific class
    deletedBy: string;           // Required - user ID
    force?: boolean;             // Optional - force delete with payments (default: false)
}
```

### Response (Success)

```typescript
{
    success: true,
    message: "Successfully deleted 45 billing records",
    results: {
        deleted: 45,
        errors: [],
        details: [
            {
                billingId: "...",
                studentName: "John Doe",
                studentId: "STU00123",
                className: "Form 1A",
                totalBilled: 1000,
                totalPaid: 0,
                hadPayments: false
            }
        ],
        warnings: [
            "Next period billing for Jane Smith exists - balance brought forward reset"
        ],
        optimization: {
            orphanedPaymentsFound: 0,
            brokenLinksFixed: 2,
            indexesRebuilt: true
        }
    },
    summary: {
        totalFound: 45,
        deleted: 45,
        errors: 0,
        warnings: 1,
        hadPayments: 0
    }
}
```

### Response (Error - Payments Exist)

```typescript
{
    error: "Cannot delete billing records with payments",
    message: "5 of 45 records have payments. Use force=true to delete anyway (not recommended).",
    billingsWithPayments: [
        {
            billingId: "...",
            studentName: "John Doe",
            studentId: "STU00123",
            className: "Form 1A",
            totalPaid: 500,
            paymentsCount: 2
        }
    ]
}
```

## What Happens Behind the Scenes

### 1. Previous Term Billing

If deleted billing had `carriedForwardFrom`:

```javascript
// Previous term billing is updated
{
    carriedForwardTo: undefined,  // Removed
    isCurrent: true               // Set back to current
}
```

### 2. Next Term Billing

If deleted billing had `carriedForwardTo`:

```javascript
// Next term billing is updated
{
    carriedForwardFrom: undefined,     // Removed
    balanceBroughtForward: 0           // Reset to 0
}
```

⚠️ **Warning**: This means if next term bills exist, students will lose their balance brought forward!

### 3. Database Optimization

#### Orphaned Payments Detection

```javascript
// Payments with no matching billing are identified
SELECT * FROM FeesPayment
WHERE academicYear = X
  AND academicTerm = Y
  AND NOT EXISTS (
    SELECT 1 FROM StudentBilling
    WHERE student = FeesPayment.student
      AND academicYear = X
      AND academicTerm = Y
  )
```

#### Broken Links Cleanup

```javascript
// Find billings with references to non-existent records
// Automatically remove invalid references
```

## Edge Cases & Solutions

### Case 1: Bills Exist for Multiple Terms

**Scenario:**

-   Term 1: Bills generated (want to delete)
-   Term 2: Bills also generated (should keep)

**What Happens:**

-   Term 1 bills deleted
-   Term 2 bills kept
-   Term 2 `balanceBroughtForward` reset to 0
-   Warning message shown

**Solution:**

-   Note the affected students
-   Manually adjust Term 2 balanceBroughtForward if needed
-   Or regenerate Term 2 after fixing Term 1

### Case 2: Some Students Have Paid

**Scenario:**

-   45 students with bills
-   5 have made partial payments
-   40 have not paid

**Default Behavior:**

-   Deletion **blocked**
-   Error message with list of 5 students who paid

**Options:**

1. **Recommended**: Use additional charges for the 40 students
2. **Caution**: Manually refund 5 students, then delete all
3. **Not Recommended**: Use `force: true` (orphans payment records)

### Case 3: Class-Specific Deletion

**Scenario:**

-   Want to delete Form 1A bills only
-   Keep other classes unchanged

**Solution:**

```typescript
{
    schoolSiteId: "...",
    academicYear: "2025-2026",
    academicTerm: 1,
    classId: "form1a_id",  // ← Specify class
    deletedBy: "user_id"
}
```

### Case 4: Accidental Deletion

**Prevention:**

-   Always have database backup
-   Test on staging environment first
-   Verify payment status before deletion

**Recovery:**

-   Restore from database backup
-   Or regenerate bills (payments are separate)

## Testing Checklist

### Before Deletion

-   [ ] Confirmed no payments made
-   [ ] Updated fee configurations
-   [ ] Have database backup
-   [ ] Tested on staging/development
-   [ ] Notified relevant stakeholders
-   [ ] Documented reason for deletion

### During Deletion

-   [ ] Read warning dialog carefully
-   [ ] Verify selected filters (site, year, term)
-   [ ] Note the number of bills to be deleted
-   [ ] Confirm expected count matches actual

### After Deletion

-   [ ] Review deletion summary
-   [ ] Check optimization results
-   [ ] Note any warnings
-   [ ] Verify bills removed from database
-   [ ] Check for orphaned payments

### After Regeneration

-   [ ] Run "Verify Coverage" - should be 100%
-   [ ] Sample check student bills
-   [ ] Verify fee amounts are correct
-   [ ] Check balance brought forward values
-   [ ] Test payment entry on new bills
-   [ ] Inform finance department

## Monitoring & Auditing

### Activity Log

Every deletion is logged in ActivityLog:

```javascript
{
    category: 'system',
    actionType: 'bulk_delete',
    entityType: 'billing',
    description: 'Bulk deleted 45 billing records',
    performedBy: userId,
    timestamp: Date.now()
}
```

### Database Queries for Verification

#### Check Deleted Bills

```javascript
// Should return 0
db.studentbillings.countDocuments({
    schoolSite: siteId,
    academicYear: '2025-2026',
    academicTerm: 1
});
```

#### Check Orphaned Payments

```javascript
// Find payments with no billing
db.feespayments
    .find({
        schoolSite: siteId,
        academicYear: '2025-2026',
        academicTerm: 1
    })
    .forEach((payment) => {
        const billing = db.studentbillings.findOne({
            student: payment.student,
            schoolSite: siteId,
            academicYear: '2025-2026',
            academicTerm: 1
        });
        if (!billing) {
            print('Orphaned payment:', payment._id);
        }
    });
```

## Best Practices

### DO's ✅

1. **Always backup** database before deletion
2. **Verify** no payments made
3. **Test** on staging environment first
4. **Document** reason for deletion
5. **Inform** stakeholders (finance, admin)
6. **Update** fee configs before regeneration
7. **Verify** coverage after regeneration

### DON'Ts ❌

1. **Don't** delete if payments exist (unless absolutely necessary)
2. **Don't** delete without backup
3. **Don't** delete in production without testing
4. **Don't** forget to regenerate after deletion
5. **Don't** use force=true unless you understand implications
6. **Don't** delete during active payment collection
7. **Don't** skip verification after regeneration

## Troubleshooting

### Issue: "Cannot delete billing records with payments"

**Cause**: Some students have made payments

**Solutions:**

1. **Check payment list** in error response
2. **Review payments** with finance team
3. **Options:**
    - Refund payments and retry
    - Use additional charges for non-paying students
    - Keep existing bills and adjust manually

### Issue: "Orphaned payments found after deletion"

**Cause**: Used force=true or payments made between check and delete

**Solutions:**

1. **Identify affected payments:**
    ```javascript
    GET / api / student - billing / verify;
    // Check optimization.orphanedPaymentsFound
    ```
2. **Options:**
    - Regenerate bills (links restored)
    - Manually link payments to new bills
    - Keep payments as standalone records

### Issue: "Next term balances incorrect after deletion"

**Cause**: Deleted Term 1, but Term 2 bills already exist

**Solutions:**

1. **Review warnings** in deletion response
2. **List affected students** from warnings
3. **Options:**
    - Delete Term 2 and regenerate both
    - Manually adjust balanceBroughtForward in Term 2
    - Run script to recalculate balances

## Related Documentation

-   [BILLING_GENERATION_FIX.md](BILLING_GENERATION_FIX.md) - Bill generation system
-   [FINANCIAL_SYSTEM_COMPLETE.md](FINANCIAL_SYSTEM_COMPLETE.md) - Complete financial system
-   [BALANCE_BROUGHT_FORWARD.md](BALANCE_BROUGHT_FORWARD.md) - Balance management
-   [FEES_PAYMENT_IMPLEMENTATION.md](FEES_PAYMENT_IMPLEMENTATION.md) - Payment system

## Support & Escalation

If problems occur:

1. **Check server logs** for detailed errors
2. **Review deletion results** in response object
3. **Verify database state** with queries above
4. **Check ActivityLog** for audit trail
5. **Contact database administrator** if data recovery needed

## Summary

The bulk deletion feature provides a **safe, controlled way** to delete and regenerate billing records when fee configurations change. With proper safeguards, comprehensive logging, and automatic database optimization, it ensures data integrity while allowing flexibility in financial management.

**Key Takeaway**: Always verify no payments exist, have backups, and test thoroughly before using in production.
