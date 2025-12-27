# Person Management System - Documentation

## Overview

Comprehensive person management system for school administration with full CRUD operations, bulk upload functionality, and role-based access.

## Features

### ✅ Complete CRUD Operations

-   **Create**: Multi-step wizard form for adding new persons
-   **Read**: DataTable with advanced filtering and search
-   **Update**: Edit existing person records with pre-populated data
-   **Delete**: Confirmation dialog before deletion

### ✅ Role Management

Supports 8 person categories:

-   **Proprietor**: School owner
-   **Headmaster**: School principal/head
-   **Teacher**: Academic staff
-   **Finance Officer**: Financial management staff
-   **Student**: Enrolled students with class tracking
-   **Parent**: Guardian/parent accounts
-   **Librarian**: Library management staff
-   **Administrator**: System administrators

### ✅ Bulk Upload

-   CSV file upload for multiple persons
-   Template download functionality
-   Error reporting for failed uploads
-   Auto-generation of student/employee IDs
-   Validation with detailed error messages

### ✅ Export Functionality

-   Export to CSV format
-   Includes all person data
-   Filename with timestamp

### ✅ Advanced Filtering

-   Global search across multiple fields
-   Category filter (all role types)
-   Status filter (active/inactive)
-   Real-time filtering

### ✅ Conditional Forms

-   **Student-specific fields**:
    -   Student ID (auto-generated)
    -   Faculty, Department, Class
    -   Guardian assignment
    -   Subject enrollment
-   **Employee-specific fields**:
    -   Employee ID (auto-generated)
    -   Job title, Department
    -   TIN/SSNIT numbers
    -   Bank information
    -   Qualifications
    -   Payroll setup

### ✅ Security Features

-   Password hashing with bcryptjs
-   Password strength meter
-   Username uniqueness validation
-   Email uniqueness validation
-   Secure authentication

## API Routes

### GET /api/persons

Fetch all persons with optional filters.

**Query Parameters:**

-   `school` - Filter by school ID
-   `site` - Filter by school site ID
-   `category` - Filter by person category
-   `isActive` - Filter by active status (true/false)
-   `search` - Search across name, username, email, student ID, employee ID

**Response:**

```json
{
  "success": true,
  "count": 150,
  "persons": [...]
}
```

### POST /api/persons

Create a new person.

**Request Body:**

```json
{
    "firstName": "John",
    "lastName": "Doe",
    "username": "jdoe",
    "password": "SecurePass123",
    "personCategory": "student",
    "school": "school_id",
    "schoolSite": "site_id",
    "contact": {
        "email": "john@example.com",
        "mobilePhone": "+233123456789"
    },
    "studentInfo": {
        "faculty": "faculty_id",
        "department": "dept_id",
        "currentClass": "class_id"
    }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Person created successfully",
  "person": {...}
}
```

### GET /api/persons/[id]

Fetch a single person by ID.

**Response:**

```json
{
  "success": true,
  "person": {...}
}
```

### PUT /api/persons/[id]

Update an existing person.

**Request Body:** Same as POST (password optional in updates)

**Response:**

```json
{
  "success": true,
  "message": "Person updated successfully",
  "person": {...}
}
```

### DELETE /api/persons/[id]

Delete a person by ID.

**Response:**

```json
{
    "success": true,
    "message": "Person deleted successfully"
}
```

### POST /api/persons/bulk-upload

Upload multiple persons from CSV.

**Request Body:**

```json
{
  "persons": [
    {
      "firstName": "John",
      "username": "jdoe",
      "password": "password123",
      "personCategory": "student",
      ...
    }
  ],
  "school": "school_id",
  "schoolSite": "site_id"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Bulk upload completed: 45 successful, 5 failed",
  "result": {
    "success": 45,
    "failed": 5,
    "errors": [
      {
        "row": 3,
        "username": "jsmith",
        "error": "Username already exists"
      }
    ],
    "created": [...]
  }
}
```

## Components

### PersonManagement.tsx

Main management component with DataTable and dialogs.

**Features:**

-   DataTable with pagination
-   Advanced filters and search
-   Add/Edit/Delete actions
-   Bulk upload dialog
-   Export to CSV
-   Avatar display
-   Status tags
-   Role-specific information display

### AddPersonForm.tsx

Multi-step wizard form for creating/editing persons.

**Steps:**

1. **Basic Info**: Name, gender, date of birth, photo
2. **Contact & Address**: Phone, email, languages, address
3. **Account Setup**: Username, password, status
4. **Role & Details**: Category with conditional role-specific fields
5. **Medical Info**: Blood group, allergies, emergency contact
6. **Documents**: Official document placeholders
7. **Review**: Summary of all entered data

**Props:**

```typescript
interface AddPersonFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    editData?: any; // Person object for edit mode
}
```

## Bulk Upload CSV Format

### Template Structure

```csv
FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth
John,M,Doe,jdoe,password123,john@example.com,+2331234567890,student,male,2005-01-15
Jane,,Smith,jsmith,password123,jane@example.com,+2330987654321,teacher,female,1990-05-20
```

### Required Fields

-   `FirstName`
-   `Username`
-   `Password` (minimum 6 characters)
-   `Category` (one of: proprietor, headmaster, teacher, finance, student, parent, librarian, admin)

### Optional Fields

-   `MiddleName`
-   `LastName`
-   `Email`
-   `Phone`
-   `Gender` (male, female, other)
-   `DateOfBirth` (YYYY-MM-DD format)

### Auto-Generated IDs

-   **Students**: `STU00001`, `STU00002`, etc.
-   **Employees**: `EMP00001`, `EMP00002`, etc.

## Usage Examples

### Basic Usage

```tsx
import PersonManagement from '@/components/PersonManagement';

export default function PersonsPage() {
    return <PersonManagement />;
}
```

### Standalone Form

```tsx
import AddPersonForm from '@/components/AddPersonForm';

export default function CreatePersonPage() {
    const handleSuccess = () => {
        console.log('Person created!');
        // Navigate or refresh
    };

    return <AddPersonForm onSuccess={handleSuccess} onCancel={() => console.log('Cancelled')} />;
}
```

### Edit Mode

```tsx
import AddPersonForm from '@/components/AddPersonForm';

export default function EditPersonPage({ person }) {
    return <AddPersonForm editData={person} onSuccess={() => console.log('Updated!')} />;
}
```

## Validation Rules

### Username

-   Required
-   Unique across system
-   Converted to lowercase
-   No spaces allowed

### Password

-   **Create mode**: Required, minimum 8 characters
-   **Edit mode**: Optional (leave empty to keep current)
-   Should contain:
    -   Uppercase letters
    -   Lowercase letters
    -   Numbers
    -   (Recommended: Special characters)

### Email

-   Optional
-   Must be valid email format
-   Unique across system

### Person Category

-   Required
-   Must be one of the 8 supported categories
-   Determines which conditional fields appear

### Student-Specific

-   Student ID: Auto-generated if not provided
-   Faculty: Optional
-   Department: Optional
-   Current Class: Optional
-   Guardian: Optional (parent relationship)

### Employee-Specific

-   Employee ID: Auto-generated if not provided
-   Job Title: Optional
-   TIN Number: Optional
-   SSNIT Number: Optional

## Database Schema

### Person Model Fields

```typescript
{
  // Basic Info
  firstName: string (required)
  middleName?: string
  lastName?: string
  dateOfBirth?: Date
  gender?: 'male' | 'female' | 'other'
  photoLink?: string

  // Contact
  contact: {
    mobilePhone?: string
    homePhone?: string
    email?: string (unique, sparse)
    primaryLanguage?: string
    secondaryLanguage?: string
  }

  // Address
  addresses: Array<{
    addressId: ObjectId (ref: Address)
    addressType: 'residential' | 'postal' | 'work' | 'temporary'
    dateFrom: Date
    dateTo?: Date
    status: 'Active' | 'Inactive'
  }>
  currentAddress: ObjectId (ref: Address)

  // Authentication
  username: string (required, unique, lowercase)
  password: string (required, hashed)
  isActive: boolean (default: true)
  lastLogin?: Date

  // School Association
  school: ObjectId (ref: School, required)
  schoolSite: ObjectId (ref: SchoolSite, required)
  personCategory: PersonCategory (required)

  // Role-Specific
  studentInfo?: {
    studentId: string (unique, sparse)
    dateJoined: Date
    faculty: ObjectId
    department: ObjectId
    currentClass: ObjectId
    guardian: ObjectId
    subjects: ObjectId[]
    classHistory: Array<{...}>
    // ... more fields
  }

  employeeInfo?: {
    customId: string (unique, sparse)
    jobTitle: string
    workDepartment: 'academic' | 'administrative' | 'support'
    teachingDepartment: ObjectId
    tinNumber: string
    ssnitNumber: string
    bankInfo: {...}
    qualifications: Array<{...}>
    payroll: {...}
    // ... more fields
  }

  // Medical
  medicalInfo: {
    bloodGroup?: BloodGroup
    allergies: string[]
    chronicConditions: string[]
    medications: Array<{...}>
    emergencyContact: {...}
  }

  // Documents
  officialDocuments: Array<{
    documentType: DocumentType
    documentId: string
    issuedDate: Date
    expiryDate: Date
    scannedCopyLink: string
  }>

  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

## Error Handling

### Common Error Responses

**400 Bad Request**

```json
{
    "success": false,
    "message": "First name is required"
}
```

**409 Conflict**

```json
{
    "success": false,
    "message": "Username already exists"
}
```

**404 Not Found**

```json
{
    "success": false,
    "message": "Person not found"
}
```

**500 Internal Server Error**

```json
{
    "success": false,
    "message": "Failed to create person",
    "error": "Detailed error message"
}
```

## Performance Considerations

### Indexes

The following fields are indexed for optimal query performance:

-   `username` (unique)
-   `contact.email` (unique, sparse)
-   `personCategory`
-   `school`
-   `schoolSite`
-   `studentInfo.studentId` (unique, sparse)
-   `employeeInfo.customId` (unique, sparse)

### Query Optimization

-   All queries use `.lean()` for better performance
-   Selective field population to reduce payload
-   Password field excluded from GET responses
-   Pagination implemented (10, 25, 50 rows per page)

### Bulk Upload

-   Processes records sequentially with error collection
-   Auto-increments IDs efficiently
-   Returns detailed success/failure report

## Security Best Practices

1. **Password Hashing**: All passwords hashed with bcryptjs (10 salt rounds)
2. **Password Exclusion**: Password never returned in API responses
3. **Input Validation**: All inputs validated before database operations
4. **Unique Constraints**: Username and email uniqueness enforced
5. **XSS Prevention**: Input sanitization on frontend
6. **Authentication**: Requires valid user session (AuthContext)
7. **Authorization**: School/site filtering based on logged-in user

## Future Enhancements

-   [ ] Document upload to cloud storage (AWS S3, Cloudinary)
-   [ ] Email notifications for new accounts
-   [ ] Password reset functionality
-   [ ] Multi-factor authentication
-   [ ] Audit log for person changes
-   [ ] Advanced reporting and analytics
-   [ ] Photo capture via webcam
-   [ ] QR code generation for student IDs
-   [ ] Integration with biometric systems
-   [ ] Batch operations (bulk activate/deactivate)

## Troubleshooting

### "Cannot overwrite Person model once compiled"

**Solution**: Model export pattern already implemented:

```typescript
Person = mongoose.models.Person || require('@/models/Person').default;
```

### "Username already exists" during bulk upload

**Solution**: Check CSV for duplicate usernames or usernames that already exist in the database

### Password not updating in edit mode

**Solution**: This is by design. Leave password empty to keep current password, or enter new password to update

### Dropdown options not loading

**Solution**: Ensure user has valid school and schoolSite in AuthContext

## Support

For issues or questions:

1. Check error messages in browser console
2. Review API response in Network tab
3. Verify authentication token is valid
4. Ensure all required environment variables are set

---

**Version**: 1.0.0  
**Last Updated**: December 26, 2025  
**Dependencies**: Next.js 13+, PrimeReact 10+, MongoDB, Mongoose, bcryptjs
