# CSV Bulk Upload Template - Person Management

## 📝 Template Format

### Column Headers (Case Sensitive)

```
FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth
```

## ✅ Required Columns

| Column        | Description         | Example       | Validation                  |
| ------------- | ------------------- | ------------- | --------------------------- |
| **FirstName** | Person's first name | John          | Required, non-empty         |
| **Username**  | Login username      | jdoe          | Required, unique, lowercase |
| **Password**  | Account password    | SecurePass123 | Required, min 6 chars       |
| **Category**  | Person role type    | student       | Required, valid enum        |

## 🔄 Optional Columns

| Column      | Description       | Example          | Format                 |
| ----------- | ----------------- | ---------------- | ---------------------- |
| MiddleName  | Middle name       | Michael          | Text                   |
| LastName    | Last name/surname | Doe              | Text                   |
| Email       | Email address     | john@example.com | Valid email format     |
| Phone       | Mobile number     | +233123456789    | Text with country code |
| Gender      | Gender            | male             | male, female, other    |
| DateOfBirth | Birth date        | 2005-01-15       | YYYY-MM-DD             |

## 🎯 Valid Category Values

Must be **lowercase** and one of:

-   `student` - For enrolled students
-   `teacher` - For teaching staff
-   `headmaster` - For school principal
-   `proprietor` - For school owner
-   `finance` - For finance officers
-   `parent` - For student guardians
-   `librarian` - For library staff
-   `admin` - For system administrators

## 📋 Sample Templates

### Students Only

```csv
FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth
John,M,Doe,jdoe,Password123,john.doe@school.com,+233123456789,student,male,2005-01-15
Jane,A,Smith,jsmith,Password123,jane.smith@school.com,+233234567890,student,female,2006-03-20
Michael,,Brown,mbrown,Password123,michael.brown@school.com,+233345678901,student,male,2005-08-10
Sarah,L,Johnson,sjohnson,Password123,sarah.johnson@school.com,+233456789012,student,female,2006-11-05
David,K,Williams,dwilliams,Password123,david.williams@school.com,+233567890123,student,male,2005-02-28
```

### Teachers Only

```csv
FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth
Alice,M,Wilson,awilson,TeachPass123,alice.wilson@school.com,+233678901234,teacher,female,1985-05-15
Robert,J,Davis,rdavis,TeachPass123,robert.davis@school.com,+233789012345,teacher,male,1980-09-20
Emily,S,Martinez,emartinez,TeachPass123,emily.martinez@school.com,+233890123456,teacher,female,1988-12-10
James,T,Anderson,janderson,TeachPass123,james.anderson@school.com,+233901234567,teacher,male,1983-07-25
```

### Mixed Staff

```csv
FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth
Dr. Samuel,O,Mensah,smensah,AdminPass123,samuel.mensah@school.com,+233111111111,headmaster,male,1970-01-10
Mary,A,Asante,masante,FinancePass123,mary.asante@school.com,+233222222222,finance,female,1982-04-15
Peter,K,Boateng,pboateng,LibraryPass123,peter.boateng@school.com,+233333333333,librarian,male,1990-08-20
```

### Minimal Template (Required Fields Only)

```csv
FirstName,Username,Password,Category
John,jdoe,Pass123!,student
Jane,jsmith,Pass123!,teacher
Mike,mbrown,Pass123!,student
Sarah,sjohnson,Pass123!,parent
```

## 🔨 Creating Your Upload File

### Using Microsoft Excel

1. Open Excel
2. Create headers in row 1
3. Fill data starting from row 2
4. Click File → Save As
5. Choose "CSV (Comma delimited) (\*.csv)"
6. Save file

### Using Google Sheets

1. Open Google Sheets
2. Create headers in row 1
3. Fill data starting from row 2
4. Click File → Download → Comma-separated values (.csv)

### Using Numbers (Mac)

1. Open Numbers
2. Create headers in row 1
3. Fill data starting from row 2
4. Click File → Export To → CSV
5. Save file

## ✏️ Data Entry Tips

### Username Rules

-   ✅ Lowercase letters, numbers, underscores
-   ✅ Must be unique across system
-   ❌ No spaces allowed
-   ❌ No special characters except underscore
-   **Examples**: `jdoe`, `john_doe`, `jdoe123`

### Password Requirements

-   ✅ Minimum 6 characters (8+ recommended)
-   ✅ Mix of uppercase and lowercase
-   ✅ Include numbers
-   ✅ Can include special characters
-   **Examples**: `Password123`, `SecurePass!`, `MyP@ss2024`

### Email Format

-   ✅ Valid email format: `name@domain.com`
-   ✅ Must be unique across system
-   ❌ Don't use duplicate emails
-   **Examples**: `john@school.com`, `teacher@example.com`

### Phone Format

-   ✅ Include country code: `+233`
-   ✅ No spaces in number
-   ✅ Or use spaces: `+233 12 345 6789`
-   **Examples**: `+233123456789`, `+233 20 123 4567`

### Date Format

-   ✅ Use ISO format: `YYYY-MM-DD`
-   ✅ Ensure valid dates
-   **Examples**: `2005-01-15`, `1985-12-25`, `2000-06-30`

### Gender Values

-   ✅ `male`, `female`, or `other`
-   ✅ Lowercase only
-   **Examples**: `male`, `female`, `other`

## ⚠️ Common Errors

### Error: "Username already exists"

**Cause**: Username is already used by another person  
**Solution**: Change username to something unique  
**Example**: `jdoe` → `jdoe2`, `john.doe`, `j.doe`

### Error: "Email already exists"

**Cause**: Email is already registered  
**Solution**: Use different email or remove email field

### Error: "Password must be at least 6 characters"

**Cause**: Password too short  
**Solution**: Use longer password (8+ recommended)  
**Example**: `pass` → `Password123`

### Error: "First name is required"

**Cause**: FirstName column empty  
**Solution**: Ensure all rows have FirstName value

### Error: "Person category is required"

**Cause**: Category column empty or invalid value  
**Solution**: Use valid category (student, teacher, etc.)

### Error: "Invalid date format"

**Cause**: Wrong date format  
**Solution**: Use YYYY-MM-DD format  
**Example**: `15/01/2005` → `2005-01-15`

## 📊 Bulk Upload Process

### Step 1: Prepare CSV

```
1. Download template from system
2. Fill in data in Excel/Sheets
3. Check for duplicates
4. Validate required fields
5. Save as CSV
```

### Step 2: Upload File

```
1. Click "Bulk Upload" button
2. Read instructions
3. Click "Select CSV File"
4. Choose your CSV file
5. System processes automatically
```

### Step 3: Review Results

```
Success: 45 records created
Failed: 5 records
Errors:
- Row 3: Username 'jdoe' already exists
- Row 7: Invalid email format
- Row 12: Password too short
- Row 18: Category 'staff' is invalid
- Row 23: FirstName is required
```

## 🎯 Best Practices

### Before Upload

1. ✅ Start with small batch (5-10) to test
2. ✅ Use template format exactly
3. ✅ Check for duplicate usernames
4. ✅ Verify email formats
5. ✅ Ensure passwords meet requirements
6. ✅ Use consistent date format
7. ✅ Validate category names

### During Data Entry

1. ✅ Keep usernames simple and memorable
2. ✅ Use consistent password pattern (change before first login)
3. ✅ Double-check email addresses
4. ✅ Use full names (First, Middle, Last)
5. ✅ Include country codes for phones
6. ✅ Use lowercase for category
7. ✅ Leave optional fields empty if unknown

### After Upload

1. ✅ Review success/failure report
2. ✅ Fix failed records manually
3. ✅ Verify data in system
4. ✅ Notify users to change passwords
5. ✅ Archive upload file for records

## 🔢 Auto-Generated Fields

The following fields are **automatically generated** by the system:

### Student ID

-   Format: `STU00001`, `STU00002`, etc.
-   Generated for: Category = `student`
-   Sequential numbering per school

### Employee ID

-   Format: `EMP00001`, `EMP00002`, etc.
-   Generated for: All categories except `student` and `parent`
-   Sequential numbering per school

**Note**: You can provide custom IDs in the CSV if needed, but it's recommended to let the system auto-generate them.

## 📥 Download Template

### From System

1. Navigate to Person Management
2. Click "Bulk Upload" button
3. Click "Download Template"
4. Template downloads with sample data

### Template Contents

```csv
FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth
John,M,Doe,jdoe,password123,john@example.com,+2331234567890,student,male,2005-01-15
Jane,,Smith,jsmith,password123,jane@example.com,+2330987654321,teacher,female,1990-05-20
```

## 🔍 Validation Checklist

Before uploading, verify:

-   [ ] All required columns present (FirstName, Username, Password, Category)
-   [ ] No empty FirstName fields
-   [ ] All usernames unique
-   [ ] All usernames lowercase
-   [ ] All passwords at least 6 characters
-   [ ] All email addresses valid format
-   [ ] All email addresses unique
-   [ ] All categories valid and lowercase
-   [ ] All dates in YYYY-MM-DD format
-   [ ] All genders are male/female/other
-   [ ] File saved as .csv format
-   [ ] File encoding is UTF-8

## 💡 Advanced Tips

### Generating Usernames

Pattern: `firstnamelastname` or `firstname.lastname`

```
John Doe → jdoe or john.doe
Jane Smith → jsmith or jane.smith
```

### Generating Passwords

Temporary pattern: `FirstName123!`

```
John Doe → John123!
Jane Smith → Jane123!
```

**Note**: Users should change passwords after first login

### Batch Processing

For large uploads (100+ records):

```
1. Split into batches of 50
2. Upload batch 1
3. Review errors
4. Fix errors
5. Upload batch 2
6. Repeat
```

## 📞 Need Help?

### Resources

-   **User Guide**: Complete instructions
-   **Technical Docs**: API specifications
-   **Quick Reference**: Cheat sheet

### Common Questions

**Q: Can I upload students and teachers in the same file?**  
A: Yes! Just ensure the Category column has the correct value for each row.

**Q: What if I don't have email addresses?**  
A: Leave the Email column empty. It's optional.

**Q: Can I update existing persons via CSV?**  
A: No. Bulk upload is for creating new persons only. Use the Edit function for updates.

**Q: How many records can I upload at once?**  
A: Up to 500 records recommended per batch. System can handle more but smaller batches are easier to troubleshoot.

**Q: What happens to failed records?**  
A: They're reported in the upload result. You'll need to fix and upload them separately.

---

**Template Version**: 1.0  
**Last Updated**: December 26, 2025  
**System**: School Management Portal
