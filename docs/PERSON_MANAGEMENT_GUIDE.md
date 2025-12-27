# Person Management - Quick Start Guide

## 🚀 Getting Started

### Accessing Person Management

Navigate to: `/persons` in your school portal

## 📋 Main Features

### 1. View All Persons

-   **DataTable** displays all persons with:
    -   Avatar and full name
    -   Category badge (color-coded)
    -   Contact information (email, phone)
    -   Role-specific details (Student ID, Class, Job Title)
    -   Active/Inactive status
    -   Action buttons (Edit, Delete)

### 2. Search & Filter

-   **Global Search**: Type in search box to find persons by name, username, email, student ID, or employee ID
-   **Category Filter**: Dropdown to filter by role (Student, Teacher, etc.)
-   **Status Filter**: Filter by Active or Inactive accounts
-   **Stats Chips**: See total count and active count at a glance

### 3. Add New Person

Click **"Add Person"** button to open the multi-step wizard:

#### Step 1: Basic Info

-   First Name (required)
-   Middle Name (optional)
-   Last Name (optional)
-   Gender (radio buttons)
-   Date of Birth (calendar picker)
-   Profile Photo (upload button)

#### Step 2: Contact & Address

-   Mobile Phone
-   Home Phone
-   Email Address
-   Primary Language
-   Select Current Address (from dropdown)

#### Step 3: Account Setup

-   Username (required, unique, lowercase)
-   Password (required, min 8 chars)
    -   Password strength meter shows security level
-   Confirm Password
-   Account Status (Active/Inactive toggle)

#### Step 4: Role & Details

-   Select Person Category (required)
-   **If Student**: Shows student panel with:
    -   Student ID (auto-generated)
    -   Date Joined
    -   Faculty, Department
    -   Current Class
    -   Guardian (parent selection)
    -   Subjects (multi-select)
-   **If Employee**: Shows employee panel with:
    -   Employee ID (auto-generated)
    -   Job Title
    -   Date Joined
    -   TIN Number

#### Step 5: Medical Info

-   Blood Group
-   Allergies (chip input - press Enter after each)
-   Chronic Conditions
-   Emergency Contact (name, relationship, phones)

#### Step 6: Documents

-   Info about document uploads (available after creation)

#### Step 7: Review

-   Summary of all entered information
-   Verify before submitting

**Navigation:**

-   Click **"Next"** to proceed to next step
-   Click **"Previous"** to go back
-   Click **"Save Draft"** to save progress
-   Click **"Submit"** on final step to create person

### 4. Edit Person

1. Click the **pencil icon** (✏️) in the Actions column
2. Form opens with all current data pre-filled
3. Make your changes
4. **Password field**: Leave empty to keep current password, or enter new password to update
5. Click **"Submit"** to save changes

### 5. Delete Person

1. Click the **trash icon** (🗑️) in the Actions column
2. Confirm deletion in the dialog
3. Person is permanently removed

### 6. Bulk Upload (CSV)

Click **"Bulk Upload"** button:

1. **Prepare CSV File**:
    - Click "Download Template" to get sample format
    - Fill in person details in Excel/Sheets
    - Save as CSV file
2. **Upload**:
    - Click "Select CSV File"
    - Choose your CSV file
    - System automatically uploads and processes
3. **Review Results**:
    - Success toast shows how many succeeded/failed
    - Check console for detailed error messages if any failed

**CSV Required Columns:**

-   FirstName
-   Username
-   Password
-   Category (student, teacher, etc.)

**CSV Optional Columns:**

-   MiddleName, LastName
-   Email, Phone
-   Gender, DateOfBirth

### 7. Export Data

Click **"Export"** button:

-   Downloads all persons as CSV file
-   Filename includes current date
-   Opens in Excel/Sheets for further analysis

### 8. Refresh Data

Click the **refresh icon** (🔄) to reload the table with latest data

## 💡 Tips & Tricks

### Creating Students

1. Select "Student" category in Step 4
2. Student ID auto-generates (e.g., STU00001)
3. Assign to Faculty, Department, and Class
4. Link to Guardian (parent) if available
5. Enroll in subjects

### Creating Teachers

1. Select "Teacher" category in Step 4
2. Employee ID auto-generates (e.g., EMP00001)
3. Enter job title (e.g., "Mathematics Teacher")
4. Assign to teaching department
5. Optional: TIN/SSNIT numbers for payroll

### Password Requirements

-   Minimum 8 characters
-   Include uppercase letters
-   Include lowercase letters
-   Include numbers
-   Strength meter shows: Red (weak), Orange (fair), Green (strong)

### Username Rules

-   Must be unique
-   Automatically converted to lowercase
-   No spaces allowed
-   Can use letters, numbers, underscores

### Bulk Upload Best Practices

1. Start with small batch (5-10) to test
2. Use template format exactly
3. Check for duplicate usernames before upload
4. Ensure passwords meet minimum requirements
5. Use consistent date format: YYYY-MM-DD
6. Valid categories: student, teacher, headmaster, proprietor, finance, parent, librarian, admin

### Search Tips

-   Search by first name, last name, or full name
-   Search by username
-   Search by email address
-   Search by student ID (e.g., STU00123)
-   Search by employee ID (e.g., EMP00456)
-   Results update instantly as you type

## ⚠️ Common Issues

### "Username already exists"

**Solution**: Choose a different username. Usernames must be unique across all persons.

### "Email already exists"

**Solution**: Use a different email or check if person already has an account.

### Password too short

**Solution**: Password must be at least 8 characters. Use mix of upper, lower, numbers.

### Passwords don't match

**Solution**: Ensure "Password" and "Confirm Password" fields have identical values.

### Cannot find dropdown options

**Solution**: Ensure faculties, departments, classes are created first in their respective management sections.

### Bulk upload failures

**Solution**:

-   Check CSV format matches template
-   Verify all required columns present
-   Remove duplicate usernames
-   Check password lengths
-   Validate category names (lowercase)

## 🎯 Workflows

### Enrolling a New Student

1. Add Person → Select "Student" category
2. Fill basic info (name, gender, DOB)
3. Add contact (phone, email)
4. Create username and password
5. Assign Faculty, Department, Class
6. Select Guardian (if parent exists)
7. Enroll in subjects
8. Add medical info (allergies, emergency contact)
9. Submit

### Hiring a New Teacher

1. Add Person → Select "Teacher" category
2. Fill basic info with photo
3. Add contact information
4. Create username and password
5. Enter job title and teaching department
6. Add TIN/SSNIT for payroll
7. Add medical info
8. Submit

### Bulk Student Upload

1. Download CSV template
2. Fill student details in Excel:
    - Format: FirstName, LastName, Username, Password, student, Gender, DOB
3. Save as CSV
4. Click Bulk Upload
5. Select file
6. Review success/failure report
7. Manually fix any failed entries

### Exporting for Analysis

1. Apply filters (e.g., Category: Student, Status: Active)
2. Click Export
3. Open CSV in Excel
4. Analyze data (pivot tables, charts, etc.)

## 📱 Mobile Usage

The interface is fully responsive:

-   **Cards stack vertically** on mobile
-   **Filters collapse** for space efficiency
-   **Table scrolls horizontally** if needed
-   **Forms adapt** to single column layout
-   **Touch-friendly buttons** with adequate spacing

## 🔒 Security Notes

-   **Passwords are hashed** - never stored in plain text
-   **Passwords hidden** in all API responses
-   **Username/email unique** - prevents duplicate accounts
-   **Activity logged** - audit trail maintained
-   **Session required** - must be logged in
-   **Role-based access** - permissions enforced

## 📞 Support

If you encounter issues:

1. Check your internet connection
2. Refresh the page
3. Clear browser cache
4. Try different browser
5. Contact system administrator

---

**Quick Access:** Navigate to `/persons` in your portal menu

**Version:** 1.0.0  
**Updated:** December 26, 2025
