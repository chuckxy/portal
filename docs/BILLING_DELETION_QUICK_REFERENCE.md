# Billing Deletion & Regeneration - Quick Reference

## When Fee Configurations Change After Bill Generation

### Scenario

-   ✅ Bills already generated for Term 1
-   ⚠️ Fee configuration changed (increased/decreased)
-   ❓ Need to apply new fees to existing bills

---

## Solution: Delete & Regenerate Workflow

```
┌─────────────────────────────────────────┐
│  1. Verify No Payments Made             │  ⚠️ CRITICAL
├─────────────────────────────────────────┤
│  • Check with finance department        │
│  • Run payment reports                  │
│  • If payments exist, see alternatives  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  2. Backup Database                     │  ⚠️ REQUIRED
├─────────────────────────────────────────┤
│  • Full database backup                 │
│  • Test restore process                 │
│  • Store backup securely                │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  3. Update Fee Configuration            │
├─────────────────────────────────────────┤
│  • Finance → Fee Configuration          │
│  • Update fee amounts                   │
│  • Save changes                         │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  4. Delete Existing Bills               │
├─────────────────────────────────────────┤
│  Finance → Billing Management           │
│  • Select Site, Year, Term              │
│  • Click "Delete Bills"                 │
│  • Confirm deletion                     │
│  • Review results                       │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  5. Regenerate with New Fees            │
├─────────────────────────────────────────┤
│  • Click "Generate Bills"               │
│  • Confirm generation                   │
│  • Review class breakdown               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  6. Verify Coverage                     │  ✅ VERIFY
├─────────────────────────────────────────┤
│  • Click "Verify Coverage"              │
│  • Confirm 100% coverage                │
│  • Spot check student bills             │
└─────────────────────────────────────────┘
```

---

## UI Buttons Overview

| Button              | Icon | Color | Action                      | When to Use                          |
| ------------------- | ---- | ----- | --------------------------- | ------------------------------------ |
| **Verify Coverage** | ✓    | Blue  | Check for missing bills     | Before/after generation              |
| **Delete Bills**    | 🗑️   | Red   | Delete all bills for period | Fee config changed, no payments      |
| **Generate Bills**  | ⚙️   | Green | Create new bills            | Initial generation or after deletion |
| **Refresh**         | ↻    | Gray  | Reload data                 | Update display                       |

---

## Safety Checks Built-In

### Automatic Protections

-   ✅ Blocks deletion if payments exist (unless force=true)
-   ✅ Shows list of bills with payments before blocking
-   ✅ Updates linked billing records (prev/next terms)
-   ✅ Optimizes database after deletion
-   ✅ Creates audit trail for all operations

### What Gets Updated

```
Previous Term Billing:
  carriedForwardTo → removed
  isCurrent → set to true

Deleted Term Billing:
  ❌ Completely removed

Next Term Billing (if exists):
  carriedForwardFrom → removed
  balanceBroughtForward → reset to 0
  ⚠️ Warning shown to user
```

---

## Alternatives to Deletion

### If Payments Already Made:

#### Option 1: Additional Charges (Recommended)

```
For fee increase:
- Keep existing bills
- Add difference as additional charge
- Category: "tuition" or "miscellaneous"
- Particulars: "Fee adjustment"
```

#### Option 2: Manual Adjustment

```
For few students:
- Individually add charges
- Document in notes
- Inform affected students
```

#### Option 3: Credit/Refund

```
For fee decrease:
- Issue credit memos
- Or process refunds
- Then regenerate if needed
```

---

## Quick Checks

### Before Deletion

```bash
✓ No payments made?
✓ Database backup exists?
✓ Fee config updated?
✓ Stakeholders informed?
✓ Tested on staging?
```

### After Deletion

```bash
✓ Deletion count as expected?
✓ No errors in results?
✓ Warnings reviewed?
✓ Database optimized?
```

### After Regeneration

```bash
✓ 100% coverage verified?
✓ Fee amounts correct?
✓ Sample bills checked?
✓ Finance department informed?
```

---

## Common Scenarios

### Scenario A: All Classes, No Payments

```
Action: Delete All → Regenerate All
Risk: Low ✅
Time: ~5 minutes
```

### Scenario B: One Class, No Payments

```
Action: Delete Class → Regenerate Class
Risk: Low ✅
Time: ~2 minutes
Tip: Select class in filters
```

### Scenario C: Some Payments Made

```
Action: Use Additional Charges
Risk: None ✅
Time: ~10 minutes
Tip: Don't use deletion
```

### Scenario D: Many Payments Made

```
Action: Keep current bills, adjust manually
Risk: None ✅
Time: Varies
Tip: Document adjustments
```

---

## Error Messages Decoded

### "Cannot delete billing records with payments"

-   **Meaning**: Some students have paid
-   **Action**: Review payment list in error
-   **Solution**: Refund or use additional charges

### "Orphaned payments found: X"

-   **Meaning**: Payments exist without bills
-   **Action**: Check optimization results
-   **Solution**: Regenerate or manually link

### "Next period billing exists - balance reset"

-   **Meaning**: Term 2 bills exist, B/F reset
-   **Action**: Note affected students
-   **Solution**: Adjust Term 2 or regenerate

---

## API Quick Reference

### Delete Bills

```typescript
POST / api / student -
    billing / bulk -
    delete {
        schoolSiteId: string,
        academicYear: string,
        academicTerm: number,
        classId: string, // optional
        deletedBy: string,
        force: false // never use true!
    };
```

### Verify Coverage

```typescript
GET /api/student-billing/verify
  ?schoolSiteId=xxx
  &academicYear=2025-2026
  &academicTerm=1
  &classId=optional
```

---

## Decision Tree

```
Need to change fees after generation?
  │
  ├─ Have payments been made?
  │   │
  │   ├─ YES → Use Additional Charges
  │   │         or Manual Adjustment
  │   │
  │   └─ NO → Continue below
  │
  ├─ Have database backup?
  │   │
  │   ├─ NO → Create backup first!
  │   │
  │   └─ YES → Continue below
  │
  ├─ Is this production?
  │   │
  │   ├─ YES → Test on staging first!
  │   │
  │   └─ NO → Continue below
  │
  └─ All checks passed?
      │
      └─ YES → Proceed with deletion
```

---

## Key Takeaways

1. **Always check for payments first** - most critical step
2. **Backup before deletion** - protect your data
3. **Test on staging** - verify process works
4. **Use alternatives if payments exist** - safer approach
5. **Verify after regeneration** - confirm success
6. **Document your actions** - maintain audit trail

---

## Support Resources

-   **Detailed Guide**: [BILLING_BULK_DELETION_GUIDE.md](BILLING_BULK_DELETION_GUIDE.md)
-   **Generation Fix**: [BILLING_GENERATION_FIX.md](BILLING_GENERATION_FIX.md)
-   **Financial System**: [FINANCIAL_SYSTEM_COMPLETE.md](FINANCIAL_SYSTEM_COMPLETE.md)

---

## Emergency Contact

If something goes wrong:

1. Stop immediately
2. Check server logs
3. Review deletion results
4. Contact DBA if recovery needed
5. Have backup ready for restore
