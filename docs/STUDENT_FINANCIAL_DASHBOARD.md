# Student Financial Dashboard

## Overview

This document describes the financial information display added to the Student Dashboard, providing students and parents with comprehensive visibility into fee payments, balances, scholarships, and payment history.

## Features

### 1. Financial Statistics Cards

Four key financial metrics displayed in colorful cards:

-   **Total Fees Required**: Total fee amount for current academic term
-   **Amount Paid**: Total payments made for current term
-   **Outstanding Balance**: Remaining amount to be paid (highlighted in orange if > 0)
-   **Payment Progress**: Percentage of fees paid with color coding:
    -   Green (≥75%): Good standing
    -   Yellow (≥50%): Moderate
    -   Orange (≥25%): Warning
    -   Red (<25%): Critical

### 2. Payment Progress Bar

-   Visual progress bar showing payment completion percentage
-   Color-coded based on payment status (green/yellow/red)
-   Shows paid amount and remaining balance
-   Displays academic year and term

### 3. Payment Deadline Tracking

-   **Overdue Warning**: Red warning message if payment deadline has passed
    -   Shows number of days overdue
    -   Displays overdue tag on progress card
-   **Upcoming Deadline**: Blue info message showing payment deadline date

### 4. Last Payment Information

Displays details of most recent payment:

-   Payment date (formatted as DD/MM/YYYY)
-   Payment amount (formatted as GHS currency)

### 5. Fee Breakdown

Shows detailed breakdown of fees by determinant:

-   Lists each fee component (e.g., Tuition, Library, Sports, etc.)
-   Shows amount for each determinant
-   Displays total at bottom

### 6. Active Scholarships

Displays all active scholarships for the student:

-   Scholarship body name
-   Total amount granted
-   Academic year
-   Status badge (active/pending)
-   Formatted in cards with green gift icon

### 7. Payment History Table

Comprehensive payment history with pagination (5 rows per page):

-   **Date**: Payment date (formatted)
-   **Amount**: Amount paid (currency formatted)
-   **Method**: Payment method (Cash, Bank Transfer, Mobile Money, etc.)
-   **Receipt No.**: Receipt number for tracking
-   **Academic Period**: Year and term
-   **Remarks**: Additional notes

## Data Structure

### Financial Interface

```typescript
financial?: {
    accountBalance: number;
    totalFeesRequired: number;
    totalFeesPaid: number;
    outstandingBalance: number;
    percentagePaid: number;
    paymentDeadline?: Date;
    daysOverdue?: number;
    lastPaymentDate?: Date;
    lastPaymentAmount?: number;
    paymentHistory: Array<{
        _id: string;
        paymentDate: Date;
        amountPaid: number;
        paymentMethod: string;
        receiptNumber: string;
        academicYear: string;
        academicTerm: number;
        remarks?: string;
    }>;
    scholarships: Array<{
        _id: string;
        scholarshipBody: { _id: string; name: string };
        totalGranted: number;
        academicYear: string;
        status: string;
    }>;
    feeBreakdown: Array<{
        determinant: { _id: string; name: string };
        amount: number;
    }>;
}
```

## API Endpoint

### GET /api/students/dashboard

Fetches comprehensive student dashboard data including financial information.

**Query Parameters:**

-   `studentId` (required): Student's person ID

**Financial Data Logic:**

1. Fetches fee configuration for student's current class and term
2. Falls back to any configuration for current year if specific term not found
3. Aggregates all fee payments for current year/term
4. Calculates outstanding balance and percentage paid
5. Determines if payment is overdue based on deadline
6. Fetches active scholarships
7. Returns payment history sorted by date (newest first)

**Models Used:**

-   `FeesConfiguration`: Fee structure for student's class
-   `FeesPayment`: Payment records
-   `Scholarship`: Active scholarship records

## UI Components

### PrimeReact Components Used:

-   `Card`: Container for financial sections
-   `Divider`: Section separator with icon and label
-   `Tag`: Status badges for overdue, payment methods, etc.
-   `ProgressBar`: Visual payment progress indicator
-   `Message`: Warning and info messages
-   `DataTable`: Payment history table with pagination
-   `Column`: Table columns with custom body templates

### Helper Functions:

-   `formatCurrency(amount)`: Formats numbers as GHS currency
-   `getPaymentStatusSeverity(percentage)`: Returns color severity based on payment percentage
    -   ≥75%: 'success' (green)
    -   ≥50%: 'info' (blue)
    -   ≥25%: 'warning' (yellow)
    -   <25%: 'danger' (red)

## Color Coding

### Outstanding Balance:

-   **Orange**: When balance > 0 (warning border and icon)
-   **Gray**: When fully paid

### Payment Progress:

-   **Green**: ≥75% paid
-   **Yellow**: 50-74% paid
-   **Red**: <50% paid

### Messages:

-   **Red Warning**: Overdue payments
-   **Blue Info**: Payment deadline reminder

## Academic Year Calculation

Uses dynamic calculation based on current month:

-   **September-December** (months 8-12): Current year / Next year
-   **January-August** (months 0-7): Previous year / Current year

Example: If today is October 2024, academic year is "2024/2025"

## Conditional Display Logic

Financial information is only displayed when:

1. `dashboardData.financial` exists (not null/undefined)
2. Student has an assigned class
3. Fee configuration exists for the class

### Conditional Elements:

-   **Overdue Warning**: Only shown if `daysOverdue > 0`
-   **Payment Deadline Info**: Only shown if deadline exists and not overdue
-   **Last Payment Card**: Only shown if payment history exists
-   **Fee Breakdown**: Only shown if determinants exist in configuration
-   **Scholarships**: Only shown if active scholarships exist
-   **Payment History**: Only shown if payment records exist

## Integration Points

### Related Components:

-   **ExpenditureManagement**: Tracks school expenses
-   **StudentDebtorsManagement**: Monitors students with outstanding balances
-   **FinancialControllerDashboard**: School-wide financial overview
-   **FeeConfigurationManagement**: Sets up fee structures
-   **FeeDeterminantManagement**: Defines fee components

### Related APIs:

-   `/api/students/dashboard`: Fetches student data including financial info
-   `/api/fee-configurations`: Fee structure management
-   `/api/fee-payments`: Payment recording and retrieval
-   `/api/scholarships`: Scholarship management
-   `/api/student-debtors`: Debt tracking and reminders

## User Experience

### For Students:

-   Clear visibility of fee obligations
-   Easy tracking of payment progress
-   Access to payment history and receipts
-   Awareness of deadlines and overdue status
-   Scholarship information at a glance

### For Parents/Guardians:

-   Transparent financial status
-   Historical payment records
-   Clear breakdown of fee components
-   Scholarship tracking
-   Deadline awareness for planning

## Best Practices

### Data Privacy:

-   Financial data only visible to authenticated student
-   Secure API endpoints with proper authorization
-   No sensitive payment information exposed

### Performance:

-   Financial data fetched once during dashboard load
-   Efficient queries with proper indexes
-   Pagination for payment history

### Accessibility:

-   Color coding supplemented with text/icons
-   Clear labels and descriptions
-   Responsive design for all screen sizes

## Future Enhancements

Potential features for future implementation:

1. **Online Payment Integration**: Direct payment gateway integration
2. **Payment Reminders**: Automated email/SMS reminders for deadlines
3. **Installment Plans**: Support for payment plans with tracking
4. **Family Accounts**: Consolidated view for multiple siblings
5. **Receipt Generation**: Downloadable/printable receipt PDFs
6. **Payment Analytics**: Charts showing payment trends over time
7. **Financial Aid Requests**: In-app financial assistance applications
8. **Export Options**: Export payment history as PDF/CSV

## Testing Checklist

-   [ ] Student with no payments (0% paid)
-   [ ] Student with partial payment (25%, 50%, 75%)
-   [ ] Student with full payment (100%)
-   [ ] Student with overdue payment
-   [ ] Student with upcoming deadline
-   [ ] Student with active scholarship
-   [ ] Student with multiple scholarships
-   [ ] Student with no fee configuration
-   [ ] Student with no class assigned
-   [ ] Payment history pagination
-   [ ] Currency formatting
-   [ ] Responsive design on mobile
-   [ ] Date formatting consistency

## Troubleshooting

### Financial data not showing:

1. Verify student has an assigned class
2. Check fee configuration exists for class/year/term
3. Ensure `FeesConfiguration.isActive = true`
4. Verify student is active (`Person.isActive = true`)

### Incorrect balance calculations:

1. Verify all payments have correct `academicYear` and `academicTerm`
2. Check `FeesConfiguration.totalAmount` is set correctly
3. Ensure payment amounts are positive numbers

### Missing scholarships:

1. Check scholarship status is 'active'
2. Verify scholarship academic year matches current year
3. Ensure scholarship has valid `scholarshipBody` reference

## Related Documentation

-   [Fee Configuration Management](/docs/FEE_CONFIGURATION_GUIDE.md)
-   [Student Debtors Tracking](/docs/STUDENT_DEBTORS_GUIDE.md)
-   [Financial Controller Dashboard](/docs/FINANCIAL_CONTROLLER_GUIDE.md)
-   [Expenditure Management](/docs/EXPENDITURE_MANAGEMENT_GUIDE.md)
