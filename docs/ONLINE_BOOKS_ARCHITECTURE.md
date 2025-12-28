# Online Books Feature - Architecture Documentation

## Overview

This is a modern Next.js implementation of online book search and library integration. It allows users to search books from 5 different providers and import them into the local library system.

## Architecture Decisions

### 1. **Client vs Server Logic**

**Client Components (`'use client'`):**

-   `AddBooksOnline.tsx` - Main orchestrator with UI state management
-   `BookCard.tsx`, `SearchControls.tsx`, `BookGrid.tsx`, `ProviderSelector.tsx` - Interactive UI components
-   **Why?** These components need:
    -   React hooks (useState, useRef, useCallback)
    -   Event handlers for user interactions
    -   Real-time UI updates
    -   Browser APIs (window.open)

**Server Logic:**

-   API routes (`/api/library-items/add-online`) - Database operations
-   **Why?**
    -   Secure database access
    -   Environment variables (API keys)
    -   Server-only dependencies (Mongoose)

**Isomorphic (runs both places):**

-   Service classes (`lib/services/*`) - HTTP fetch calls
-   Helper functions (`lib/helpers/*`) - Pure utility functions
-   **Why?** Can be imported by both client components and server actions

### 2. **Provider Service Layer**

**Pattern: Strategy Pattern + Factory**

Each provider (Google Books, Open Library, etc.) implements `BookProviderService` interface:

```typescript
interface BookProviderService {
    search(params: SearchParams): Promise<{ books: UnifiedBook[]; totalResults: number }>;
    getBookDetails?(bookId: string): Promise<UnifiedBook>;
}
```

**Benefits:**

-   **Unified interface** - All providers return `UnifiedBook` format
-   **Easy switching** - Change provider without touching UI code
-   **Extensibility** - Add new providers without modifying existing code
-   **Testability** - Mock individual providers in tests

**BookProviderFactory** centralizes provider instantiation and caching.

### 3. **Data Normalization**

**Problem:** Each API returns different schemas
**Solution:** `UnifiedBook` type that normalizes all responses

**Normalization happens in each service's `normalizeBook()` method:**

```typescript
private normalizeBook(apiResponse: any): UnifiedBook {
    // Extract common fields
    // Handle missing data
    // Standardize formats
    return unifiedBook;
}
```

**Key fields:**

-   Standard identifiers (ISBN, LCCN)
-   Consistent author array
-   Normalized cover image URLs
-   Standardized access types (public, borrowable, restricted, preview)

### 4. **Pagination & Infinite Loading**

**Strategy:**

-   Fetch 20 books per API call
-   Store all fetched books in `allBooks` array
-   Display paginated view with PrimeReact Paginator
-   Auto-fetch more when user approaches end of loaded books

**Implementation:**

```typescript
const handlePageChange = (event) => {
    // Check if we need to load more
    const totalNeeded = (event.page + 1) * event.rows;
    if (totalNeeded > allBooks.length && !isLoadingMore) {
        loadMoreBooks(allBooks.length);
    }
};
```

**Benefits:**

-   Smooth UX - no loading on every page change
-   Efficient - only fetch when needed
-   Works with all providers

### 5. **Client-Side Filtering**

**Why client-side?**

-   After initial search, we have books loaded
-   Local filtering is instant (no network round-trip)
-   Reduces API calls

**Implementation:**

-   `allBooks` = all fetched books (unfiltered)
-   `books` = filtered/searched books (displayed)
-   Full-text search across title, author, publisher, ISBN, subjects

### 6. **State Management**

**No Redux** - Using React's built-in state management:

-   `useState` for component state
-   `useCallback` for memoized functions
-   `useRef` for Toast notifications

**Why no Redux?**

-   State is component-scoped (doesn't need global access)
-   Simpler, less boilerplate
-   Easier to maintain
-   Next.js App Router philosophy favors local state

### 7. **Error Handling**

**Three-tier approach:**

1. **Service level** - Throw errors with meaningful messages
2. **Component level** - Try/catch and show Toast notifications
3. **UI level** - Graceful fallbacks (placeholder images, disabled buttons)

## Folder Structure

```
/app
  /(main)
    /library
      /online-books
        page.tsx                    # Route page (wrapper)
  /api
    /library-items
      /add-online
        route.ts                    # POST endpoint to save books

/components
  /online-books
    AddBooksOnline.tsx             # Main component (orchestrator)
    BookCard.tsx                   # Individual book display
    BookGrid.tsx                   # Carousel + Pagination
    ProviderSelector.tsx           # Provider checkboxes
    SearchControls.tsx             # Search inputs & filters

/lib
  /services
    bookProviderFactory.ts         # Provider factory
    googleBooksService.ts          # Google Books API
    openLibraryService.ts          # Open Library API
    dBooksService.ts               # DBooks API
    internetArchiveService.ts      # Internet Archive API
    libraryOfCongressService.ts    # Library of Congress API
  /helpers
    bookHelpers.ts                 # Utility functions

/types
  book.ts                          # TypeScript types & interfaces
```

## Key Features

### 1. Multi-Provider Search

-   5 providers with unified interface
-   Provider-specific search options (e.g., advanced search for Google Books)
-   Automatic response normalization

### 2. Read Online

-   Opens book in new tab
-   Handles different access types
-   Fallback for unavailable books

### 3. Add to Library

-   Checks for duplicates (ISBN-based)
-   Saves to MongoDB via API route
-   Extracts all relevant metadata
-   Handles online-only books (no physical inventory)

### 4. Smart Pagination

-   Background loading
-   Infinite scroll capability
-   Per-provider result counts

### 5. Client-Side Search

-   Real-time filtering
-   Full-text search
-   No additional API calls

## Integration Points

### With Existing App:

1. **Models** - Uses existing `LibraryItem` model
2. **Database** - Connects via existing MongoDB connection
3. **UI** - Uses PrimeReact components (consistent with app)
4. **Routes** - Follows App Router conventions
5. **Auth** - Can be enhanced with existing auth context

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=your_key_here
```

(Optional - other providers don't require keys)

## Performance Considerations

1. **Service Caching** - Factory pattern caches service instances
2. **Memoized Callbacks** - useCallback prevents unnecessary re-renders
3. **Lazy Loading** - Images load on-demand with error fallbacks
4. **Optimistic UI** - Show loading states immediately
5. **Background Fetching** - Prefetch next page before user needs it

## Extension Points

### Add New Provider:

1. Create service class implementing `BookProviderService`
2. Add normalization logic
3. Register in `BookProviderFactory`
4. Update `BookProvider` type

### Add Features:

-   **Advanced Filters** - Extend `SearchParams` type
-   **Favorites** - Add to component state + API
-   **Bulk Import** - Multi-select in BookGrid
-   **Preview Modal** - Dialog with book details
-   **Download Books** - Add download handlers

## Testing Strategy

**Unit Tests:**

-   Each service's normalization logic
-   Helper functions (searchBooks, formatDate)
-   Provider factory

**Integration Tests:**

-   API route (mocked database)
-   Component interactions

**E2E Tests:**

-   Full search → add to library flow
-   Provider switching
-   Pagination

## Production Checklist

-   [x] Error handling
-   [x] Loading states
-   [x] Empty states
-   [x] Responsive design
-   [x] TypeScript types
-   [ ] Rate limiting (API routes)
-   [ ] Caching strategy (provider responses)
-   [ ] Analytics tracking
-   [ ] Accessibility (ARIA labels)
-   [ ] Performance monitoring

---

This architecture balances **simplicity**, **scalability**, and **maintainability** while following Next.js and React best practices.
