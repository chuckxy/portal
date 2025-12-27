# Person Management - Quick Reference Card

## 🔗 API Endpoints

```
GET    /api/persons              # List all persons
POST   /api/persons              # Create person
GET    /api/persons/[id]         # Get single person
PUT    /api/persons/[id]         # Update person
DELETE /api/persons/[id]         # Delete person
POST   /api/persons/bulk-upload  # Bulk upload from CSV
```

## 📊 Components

```tsx
// Main management interface
<PersonManagement />

// Statistics dashboard
<PersonStatsWidget />

// Form (standalone or dialog)
<AddPersonForm
  editData={person}     // Optional: for edit mode
  onSuccess={() => {}}  // Callback after save
  onCancel={() => {}}   // Callback on cancel
/>
```

## 🎨 Person Categories

| Category   | Badge Color | Icon              | Auto ID |
| ---------- | ----------- | ----------------- | ------- |
| Proprietor | danger      | pi-star           | EMP     |
| Headmaster | danger      | pi-crown          | EMP     |
| Teacher    | info        | pi-book           | EMP     |
| Finance    | warning     | pi-money-bill     | EMP     |
| Student    | success     | pi-graduation-cap | STU     |
| Parent     | secondary   | pi-users          | -       |
| Librarian  | info        | pi-bookmark       | EMP     |
| Admin      | warning     | pi-cog            | EMP     |

## 📝 Form Steps

1. **Basic Info** → Name, Gender, DOB, Photo
2. **Contact** → Phone, Email, Language, Address
3. **Account** → Username, Password, Status
4. **Role** → Category + Conditional Fields
5. **Medical** → Blood Group, Allergies, Emergency
6. **Documents** → ID Cards, Certificates
7. **Review** → Summary & Submit

## 🔍 Search & Filter

**Global Search:**

-   First/Last Name
-   Username
-   Email
-   Student ID
-   Employee ID

**Filters:**

-   Category (8 options)
-   Status (Active/Inactive)

## 📤 Bulk Upload CSV Format

```csv
FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth
John,M,Doe,jdoe,Pass123!,john@school.com,+233123456789,student,male,2005-01-15
Jane,,Smith,jsmith,Pass456!,jane@school.com,+233987654321,teacher,female,1990-05-20
```

**Required:** FirstName, Username, Password, Category  
**Optional:** All others

## ⚙️ Features Checklist

-   ✅ Create/Edit/Delete persons
-   ✅ Multi-step wizard form
-   ✅ Bulk CSV upload
-   ✅ CSV template download
-   ✅ Export to CSV
-   ✅ Global search
-   ✅ Category filter
-   ✅ Status filter
-   ✅ Password strength meter
-   ✅ Avatar upload/display
-   ✅ Conditional role fields
-   ✅ Auto-generated IDs
-   ✅ Statistics dashboard
-   ✅ Confirmation dialogs
-   ✅ Toast notifications
-   ✅ Responsive design
-   ✅ Loading states
-   ✅ Inline validation

## 🔐 Validation Rules

**Username:**

-   Required, unique
-   Lowercase only
-   No spaces

**Password (Create):**

-   Required
-   Min 8 characters
-   Include: uppercase, lowercase, numbers

**Password (Edit):**

-   Optional (leave empty = no change)
-   If provided: min 8 characters

**Email:**

-   Optional, unique
-   Valid format

**Person Category:**

-   Required
-   Must be valid enum value

## 🎯 Common Tasks

### Add Student

```
1. Click "Add Person"
2. Fill Basic Info
3. Add Contact
4. Create Account
5. Select "Student" category
6. Fill student details (ID auto-gen)
7. Add Medical Info
8. Review & Submit
```

### Add Teacher

```
1. Click "Add Person"
2. Fill Basic Info
3. Add Contact
4. Create Account
5. Select "Teacher" category
6. Fill job title, department
7. Add Medical Info
8. Review & Submit
```

### Bulk Upload

```
1. Click "Bulk Upload"
2. Download template
3. Fill Excel/CSV
4. Upload file
5. Review results
```

### Edit Person

```
1. Click pencil icon
2. Modify fields
3. Leave password empty to keep current
4. Click Submit
```

### Export Data

```
1. Apply filters (optional)
2. Click "Export"
3. Open CSV file
```

## 🐛 Quick Troubleshooting

| Issue                 | Solution                     |
| --------------------- | ---------------------------- |
| "Username exists"     | Choose different username    |
| "Email exists"        | Use different email          |
| Password too short    | Min 8 characters             |
| Passwords don't match | Retype carefully             |
| Upload fails          | Check CSV format             |
| Dropdowns empty       | Create faculties/depts first |
| Can't find person     | Check filters/search         |

## 💡 Pro Tips

1. **Download template** before bulk upload
2. **Test with 5 records** first
3. **Use consistent format** for dates
4. **Check duplicates** before upload
5. **Leave password empty** when editing if no change
6. **Use filters** before exporting
7. **Refresh** after bulk operations
8. **Check stats** for overview

## 🔢 Keyboard Shortcuts

-   **Enter** - Submit form step
-   **Escape** - Close dialog
-   **Tab** - Navigate fields
-   **Ctrl+F** - Focus search (browser)

## 📱 Mobile Notes

-   Tables scroll horizontally
-   Filters stack vertically
-   Forms adapt to single column
-   Touch-friendly buttons
-   Swipe for more actions

## 🚦 Status Indicators

| Color     | Meaning          |
| --------- | ---------------- |
| 🟢 Green  | Active person    |
| 🔴 Red    | Inactive person  |
| 🔵 Blue   | Info/General     |
| 🟡 Yellow | Warning          |
| 🟣 Purple | Student-specific |

## 📞 Support Resources

-   **Technical Docs**: `/docs/PERSON_MANAGEMENT.md`
-   **User Guide**: `/docs/PERSON_MANAGEMENT_GUIDE.md`
-   **Summary**: `/docs/PERSON_MANAGEMENT_SUMMARY.md`
-   **This Card**: `/docs/PERSON_MANAGEMENT_REFERENCE.md`

---

**Version**: 1.0.0 | **Updated**: Dec 26, 2025  
**Route**: `/persons` | **Components**: 3 main files
