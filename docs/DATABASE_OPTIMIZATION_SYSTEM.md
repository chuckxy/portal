# Database Optimization System

## Overview

Comprehensive database optimization system implemented for the School Portal to ensure optimal performance after person deletion operations. The system includes cascading deletes, orphaned reference cleanup, automatic reindexing, and database health monitoring.

## Key Features

### 1. **Cascading Delete Operations**
When persons are deleted (single or bulk), the system automatically:
- Deletes all related student billing records
- Removes associated fee payments
- Clears exam scores and answers
- Handles scholarship records
- Updates library lending records (soft delete)
- Removes student submissions from assignments
- Updates guardian references for orphaned students

### 2. **Transaction Safety**
All delete operations use MongoDB transactions to ensure data consistency:
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
    // All delete operations here
    await session.commitTransaction();
} catch (error) {
    await session.abortTransaction();
    throw error;
} finally {
    session.endSession();
}
```

### 3. **Active Reference Validation**
Prevents deletion of persons with:
- Active or overdue library lendings (must return items first)
- Other critical active relationships

### 4. **Automatic Reindexing**
After bulk operations, indexes are automatically rebuilt for optimal query performance on:
- Person collection
- StudentBilling collection
- FeesPayment collection
- ExamScore collection
- LibraryLending collection

### 5. **Cleanup Statistics**
Every delete operation returns detailed statistics:
```typescript
{
    personsDeleted: 5,
    studentBillingsDeleted: 45,
    feesPaymentsDeleted: 123,
    examScoresDeleted: 89,
    libraryLendingsUpdated: 12,
    assignmentsUpdated: 34,
    scholarshipsDeleted: 2,
    examAnswersDeleted: 67,
    guardiansUpdated: 3
}
```

## API Endpoints

### Single Person Delete
**Endpoint:** `DELETE /api/persons/{id}`

**Features:**
- Validates person existence
- Checks for active library lendings
- Cascades delete to all related collections
- Returns cleanup statistics
- Automatically reindexes collections

**Response:**
```json
{
    "success": true,
    "message": "Person deleted successfully",
    "cleanupStats": {
        "studentBillingsDeleted": 5,
        "feesPaymentsDeleted": 12,
        ...
    }
}
```

### Bulk Person Delete
**Endpoint:** `DELETE /api/persons/bulk-delete`

**Request Body:**
```json
{
    "personIds": ["id1", "id2", "id3"]
}
```

**Features:**
- Validates all person IDs
- Batch validation for active library lendings
- Transactional bulk delete operations
- Comprehensive cleanup of all related data
- Detailed reporting on deleted persons
- Async reindexing for performance

**Response:**
```json
{
    "success": true,
    "message": "Successfully deleted 3 person(s) and cleaned up related data",
    "deletedCount": 3,
    "cleanupStats": { ... },
    "personsDeleted": [
        {
            "_id": "...",
            "name": "John Doe",
            "username": "jdoe",
            "category": "student",
            "studentId": "STU00001"
        }
    ]
}
```

### Database Optimization Admin
**Endpoint:** `GET /api/admin/db-optimization`

**Query Parameters:**
- `action=stats` - Get collection statistics
- `action=analyze` - Analyze database fragmentation
- `collection=Person` - Get stats for specific collection

**Authorization:** Admin or Proprietor only

**Response Examples:**

*Statistics:*
```json
{
    "success": true,
    "stats": [
        {
            "collection": "Person",
            "count": 1234,
            "size": 524288,
            "avgObjSize": 425,
            "storageSize": 655360,
            "indexes": 8
        }
    ]
}
```

*Fragmentation Analysis:*
```json
{
    "success": true,
    "analysis": {
        "needsOptimization": false,
        "collections": [
            {
                "name": "Person",
                "fragmentation": 1.25,
                "recommendation": "Performance is optimal"
            }
        ]
    }
}
```

**Endpoint:** `POST /api/admin/db-optimization`

**Request Body:**
```json
{
    "operation": "reindex" | "full-optimization"
}
```

**Operations:**
- `reindex` - Rebuild indexes on all collections
- `full-optimization` - Cleanup + reindex

**Response:**
```json
{
    "success": true,
    "message": "Database optimization completed successfully",
    "report": {
        "timestamp": "2026-01-25T10:30:00.000Z",
        "totalDuration": 5432,
        "operations": [
            {
                "success": true,
                "operation": "reindex_Person",
                "duration": 1234,
                "details": { "collection": "Person" }
            }
        ],
        "overallSuccess": true
    }
}
```

## Utility Functions

Location: `lib/utils/dbOptimization.ts`

### Available Functions:

1. **`reindexCollection(collectionName)`**
   - Rebuilds indexes for a specific collection
   - Returns operation result with timing

2. **`reindexAllCollections()`**
   - Reindexes all core collections
   - Returns comprehensive report

3. **`cleanupOrphanedReferences()`**
   - Removes invalid references across collections
   - Fixes guardian references

4. **`performDatabaseOptimization()`**
   - Full optimization: cleanup + reindex
   - Returns detailed report

5. **`analyzeDatabaseFragmentation()`**
   - Analyzes storage efficiency
   - Provides optimization recommendations

6. **`getCollectionStats(collectionName)`**
   - Retrieves detailed collection metrics
   - Includes index information

## Related Collections Cleanup

### StudentBilling
- All billing records for deleted students are removed
- Ensures no orphaned financial data

### FeesPayment
- All payment records are deleted
- Maintains referential integrity

### ExamScore & ExamAnswer
- Removes all academic records
- Cleans up exam submissions

### LibraryLending
- Soft delete: status changed to 'returned'
- Adds note: "Borrower account deleted"
- Preserves lending history for audit

### Assignment
- Removes student submissions
- Updates submission counters
- Maintains assignment integrity

### Scholarship
- Removes scholarship records
- Ensures no orphaned financial aid data

### Guardian References
- Updates students who had deleted person as guardian
- Sets guardian field to null
- Maintains student record integrity

## Performance Considerations

### Async Operations
Reindexing runs asynchronously after transaction commits:
```typescript
setImmediate(async () => {
    await Promise.all([
        Person.collection.reIndex(),
        StudentBilling.collection.reIndex(),
        // ...
    ]);
});
```

### Batch Processing
Bulk deletes use efficient batch operations:
- Single transaction for all operations
- Optimized queries with `$in` operators
- Minimized round trips to database

### Index Optimization
Automatic reindexing ensures:
- Fast query performance maintained
- Efficient storage utilization
- Optimal index structures

## Activity Logging

All deletion operations are logged with full audit trail:
- Records person details before deletion
- Logs cleanup statistics
- Tracks user who performed operation
- Marked as sensitive operations
- GDPR compliance maintained

## Best Practices

1. **Always check for active relationships before deletion**
   - Library items must be returned
   - Critical operations should be validated

2. **Use bulk operations for multiple deletions**
   - More efficient than individual deletes
   - Single transaction ensures consistency

3. **Monitor cleanup statistics**
   - Review returned stats to ensure expected cleanup
   - Verify no unexpected orphaned data

4. **Run periodic optimization**
   - Schedule database optimization during low-traffic periods
   - Monitor fragmentation metrics

5. **Review activity logs**
   - Audit sensitive delete operations
   - Track data cleanup patterns

## Error Handling

The system provides comprehensive error handling:
- Validation errors (400)
- Not found errors (404)
- Active relationship conflicts (400)
- Transaction rollback on failures
- Detailed error messages

## Security

- Admin-only access to optimization endpoints
- JWT authentication required
- Activity logging for all operations
- Transaction safety prevents partial deletes
- Sensitive operation marking

## Future Enhancements

Potential additions:
1. Scheduled automatic optimization
2. Database backup before bulk operations
3. Soft delete option with recovery window
4. Advanced fragmentation analysis
5. Performance metrics dashboard
6. Automated cleanup recommendations
