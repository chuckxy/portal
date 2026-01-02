# School Data Purge System

## Overview

The School Data Purge system provides a secure, audited way for top-level administrators (proprietors) to permanently delete all data associated with a school. This is a destructive operation with multiple safeguards to prevent accidental data loss.

## Security Features

### Access Control
- **Role Restriction**: Only users with `proprietor` role can access this feature
- **JWT Validation**: All API requests require valid authentication tokens
- **Password Re-verification**: Users must re-enter their password before execution

### Confirmation Steps
1. **Select School**: Choose the school to be purged from a dropdown
2. **Review Data**: See a preview of all data that will be deleted
3. **Confirm Identity**: Re-enter password to verify identity
4. **Final Confirmation**: 
   - Acknowledge 5 warning checkboxes
   - Type exact confirmation phrase: `DELETE SCHOOL DATA`
   - Check final confirmation checkbox
5. **Execute**: Monitor progress and view results

### Audit Logging
- All purge attempts (successful or failed) are logged
- Logs are marked with `retentionPolicy: 'permanent'` and never deleted
- Logs include:
  - Administrator who executed the purge
  - Timestamp
  - IP address and user agent
  - List of all deleted collections
  - Total records deleted

## Architecture

### Components

#### UI Component
`/components/SchoolDataPurge.tsx`

A 5-step wizard using PrimeReact components:
- `Steps` for wizard navigation
- `Dropdown` for school selection
- `DataTable` for deletion preview
- `Password` for identity verification
- `Checkbox` for acknowledgements
- `InputText` for confirmation phrase
- `ProgressBar` for execution progress

#### API Endpoints

##### GET `/api/admin/school-purge`
Returns a preview of what will be deleted.

**Query Parameters:**
- `schoolId` (required): ID of the school to preview

**Response:**
```json
{
  "preview": {
    "school": {
      "id": "string",
      "name": "string",
      "code": "string"
    },
    "collections": [
      {
        "name": "string",
        "displayName": "string",
        "count": 123,
        "description": "string"
      }
    ],
    "totalRecords": 1234,
    "estimatedTime": "~5 seconds",
    "warnings": ["string"]
  }
}
```

##### DELETE `/api/admin/school-purge`
Executes the permanent deletion.

**Request Body:**
```json
{
  "schoolId": "string",
  "schoolName": "string",
  "adminId": "string",
  "adminUsername": "string",
  "confirmationPhrase": "DELETE SCHOOL DATA"
}
```

**Response:**
```json
{
  "success": true,
  "schoolId": "string",
  "schoolName": "string",
  "deletedCollections": [
    { "name": "Person", "deletedCount": 500 }
  ],
  "totalDeleted": 1500,
  "timestamp": "ISO8601 date",
  "auditLogId": "string",
  "executionTimeMs": 2500
}
```

##### POST `/api/auth/verify-password`
Verifies user password for sensitive operations.

**Request Body:**
```json
{
  "password": "string",
  "userId": "string (optional)"
}
```

**Response:**
```json
{
  "valid": true,
  "userId": "string",
  "username": "string"
}
```

### Data Deleted

The following collections are purged (in dependency order):

| Collection | Relationship | Description |
|------------|--------------|-------------|
| SchoolSite | Direct | Campus configurations |
| Person | Direct | Students, teachers, staff |
| SiteClass | Via Site | Class definitions |
| Faculty | Direct | Academic faculties |
| Department | Direct | Academic departments |
| Subject | Direct | Curriculum subjects |
| ExamScore | Direct | Examination records |
| FeesPayment | Via Site | Payment records |
| Expenditure | Direct | Expenditure records |
| Scholarship | Direct | Scholarship awards |
| ScholarshipBody | Direct | Scholarship providers |
| Timetable | Direct | Class schedules |
| Bank | Direct | Bank accounts |
| Address | Direct | Address records |
| School | Final | The school itself |

### Transaction Safety

The deletion uses MongoDB transactions to ensure atomicity:
- If any deletion fails, the entire operation is rolled back
- No partial deletions can occur

## Usage

### Menu Access
Navigate to: **Administration → School Data Purge**

### Step-by-Step Process

1. **Access the Page**
   - Only visible to proprietor users
   - Non-proprietors see an access denied message

2. **Select School**
   - Choose from dropdown of all schools
   - Click "Load Preview" to see what will be deleted

3. **Review Data**
   - Review the table of collections and record counts
   - Read all warnings carefully
   - Ensure you have backups if needed

4. **Verify Identity**
   - Enter your current password
   - Click "Verify Identity"
   - Identity must be verified before proceeding

5. **Final Confirmation**
   - Check all 5 warning acknowledgement boxes
   - Type exactly: `DELETE SCHOOL DATA`
   - Check the final confirmation box
   - Click the red "Delete School Data Permanently" button

6. **Monitor & Complete**
   - Watch the progress bar
   - View the results table showing deleted records
   - Note the audit log ID for your records

## Security Considerations

### Rate Limiting
Consider adding rate limiting to the purge endpoint to prevent abuse.

### Backup Reminder
The UI reminds users to backup data, but no automatic backup is created.

### Audit Trail
All actions are permanently logged and cannot be deleted or modified.

### Password Verification
The password verification is separate from the main JWT authentication to ensure the actual user (not someone who stole a token) is performing the action.

## Error Handling

### Failed Password Verification
- User remains on step 3
- Error message displayed
- Can retry unlimited times

### Failed Purge Execution
- Transaction is rolled back
- Error is logged to audit trail
- User sees error message with details

### Network Errors
- Toast notifications for connection issues
- State preserved for retry

## Development Notes

### Adding New Collections

To include additional collections in the purge:

1. Add to `COLLECTIONS_CONFIG` in `/app/api/admin/school-purge/route.ts`:
```typescript
{ 
  model: 'NewModel', 
  field: 'school', // or 'site' for indirect
  indirect: false, // true if via site
  displayName: 'Display Name',
  description: 'What this collection contains'
}
```

2. Import the model at the top of the file
3. Add to `MODEL_REGISTRY`

### Testing

**NEVER test on production data!**

To test:
1. Create a test school with sample data
2. Execute purge on test school
3. Verify all data is deleted
4. Verify audit log is created
5. Test rollback by simulating failure

## Files

| File | Purpose |
|------|---------|
| `/components/SchoolDataPurge.tsx` | Main UI component |
| `/app/(main)/admin/school-purge/page.tsx` | Page route |
| `/app/api/admin/school-purge/route.ts` | Backend API |
| `/app/api/auth/verify-password/route.ts` | Password verification |
| `/layout/AppMenu.tsx` | Menu entry (Administration section) |
| `/docs/SCHOOL_DATA_PURGE.md` | This documentation |
