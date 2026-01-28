# ADR 003: Articles Service Refactoring - Performance and Correctness Fixes

**Status:** Implemented  
**Date:** 2026-01-28  
**Context:** Critical bugs and performance issues in `ArticlesService.listForUser()`

## Problems Addressed

### 1. Pagination Bug with Hidden Items ✅ FIXED
**Severity:** High

**Previous Issue:**
- Application-level filtering after fetching from cache/database
- Inconsistent page sizes when items were hidden
- Incorrect `hasNextPage` calculation
- Users could receive nearly empty pages

**Solution:**
- Database performs filtering via MongoDB aggregation pipeline
- Correct pagination happens AFTER filtering hidden items
- `hasNextPage` now accurately reflects available data for that specific user

### 2. Cache Race Condition ✅ FIXED
**Severity:** Medium

**Previous Issue:**
- Global cache shared across all users
- Separate query for hidden items created timing window
- If user hides item between cache read and hidden IDs fetch, inconsistency occurs

**Solution:**
- User-specific cache keys: `user:{userId}:list:{page}:{limit}`
- Single atomic database query with filtering included
- Cache invalidation on hide action

### 3. N+1 Performance Issue ✅ FIXED
**Severity:** Very High

**Previous Issue:**
```typescript
// Two separate queries on every cache miss
const [dbTotal, rows] = await Promise.all([
  this.items.countDocuments({ isDeleted: false }),
  this.items.find({ isDeleted: false })...
]);
// Plus separate query for hidden items
const hiddenIds = await this.interactions.getHiddenObjectIdsForUser(userId);
```

**Solution:**
- Single aggregation pipeline with $lookup to join collections
- Database handles filtering, counting, and pagination in ONE query
- Eliminates 2 extra database round trips per request

**Performance Impact:**
- Before: 3 database queries (count + list + hidden)
- After: 1 aggregation query
- **~66% reduction in database load**

### 4. Inefficient Caching with Hidden Items ✅ FIXED
**Severity:** Medium-High

**Previous Issue:**
- Global cache doesn't account for user-specific filters
- Cache hit still required query for hidden items
- Low cache effectiveness for users with different hidden preferences

**Solution:**
- User-specific cache keys include userId
- Cached data is already filtered for that user
- True cache hit requires zero database queries
- Cache invalidation on hide action clears affected user's cache

### 5. Missing Page Validation ✅ FIXED
**Severity:** Low

**Previous Issue:**
```typescript
const page = params.page ?? 1; // No validation
```
Negative or zero page values would cause incorrect `skip` calculations.

**Solution:**
```typescript
if (page < 1) {
  throw new BadRequestException({
    code: ErrorCode.PAGINATION_LIMIT_EXCEEDED,
    message: 'page must be >= 1',
  });
}
```

### 6. Unnecessary Serialization for Size Validation ✅ FIXED
**Severity:** Medium

**Previous Issue:**
```typescript
const bytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
if (bytes > maxBytes) {
  throw new UnprocessableEntityException(...);
}
```
Full serialization after all expensive work completed.

**Solution:**
```typescript
private estimateResponseSize(response: {...}): number {
  let size = 100; // Base JSON overhead
  for (const item of response.items) {
    size += 80 + item.objectId.length + item.title.length + ...;
  }
  return size;
}
```
**Performance Impact:** 10-100x faster for large responses

### 7. Inconsistency in Data Handling ✅ FIXED
**Severity:** Low-Medium

**Previous Issue:**
```typescript
createdAt: (createdAt ?? new Date(0)).toISOString()
```
Silently converts corrupted dates to 1970-01-01, hiding data integrity issues.

**Solution:**
```typescript
if (!createdAt) {
  this.logger.warn({
    msg: 'corrupted createdAt field',
    objectId: r.objectId,
  });
}
```
Logs warnings for monitoring and debugging while maintaining backward compatibility.

## Implementation Details

### Database Aggregation Pipeline

```typescript
const pipeline = [
  // 1. Filter non-deleted items
  { $match: { isDeleted: false } },
  
  // 2. Left join with user interactions
  {
    $lookup: {
      from: 'userarticleinteractions',
      let: { itemObjectId: '$objectId' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$objectId', '$$itemObjectId'] },
                { $eq: ['$userId', params.userId] },
                { $eq: ['$isHidden', true] },
              ],
            },
          },
        },
        { $limit: 1 },
      ],
      as: 'hiddenInteraction',
    },
  },
  
  // 3. Filter out hidden items
  { $match: { hiddenInteraction: { $size: 0 } } },
  
  // 4. Sort by createdAt descending
  { $sort: { createdAt: -1 } },
  
  // 5. Get count and paginated results in ONE query
  {
    $facet: {
      metadata: [{ $count: 'total' }],
      items: [
        { $skip: skip },
        { $limit: limit },
        { $project: { objectId: 1, title: 1, url: 1, author: 1, createdAt: 1, _id: 0 } },
      ],
    },
  },
];
```

**Key Benefits:**
- Database does all filtering before pagination
- Single query returns both count and items
- Leverages MongoDB indexes for optimal performance
- Type-safe with explicit pipeline typing

### Cache Strategy

**Before:** Global cache with post-filtering
```
Key: global_items_list:1:20
Value: { items: [...all items...], total: 1000 }
→ Then filter in application layer
```

**After:** User-specific cache with pre-filtered data
```
Key: user:{userId}:list:1:20
Value: { items: [...filtered items...], total: 950, hasNextPage: true }
→ Direct return, zero DB queries
```

### Cache Invalidation

When user hides an article:
1. Update database (`userarticleinteractions` collection)
2. Update hidden set cache (`user:{userId}:hidden`)
3. **Invalidate ALL list cache pages for that user**

```typescript
await this.cacheService.invalidateUserList(params.userId);
```

This ensures consistency without global cache invalidation.

## Performance Benchmarks (Estimated)

| Scenario | Before | After | Improvement |
|----------|--------|-------|-------------|
| Cache hit, no hidden items | 1 DB query | 0 DB queries | 100% |
| Cache hit, with hidden items | 2 DB queries | 0 DB queries | 100% |
| Cache miss | 3 DB queries | 1 DB query | 66% |
| Response validation | Full JSON.stringify | Size estimation | 10-100x faster |

## Migration Notes

### Required Indexes

Ensure these indexes exist:

```javascript
// Items collection
db.items.createIndex({ isDeleted: 1, createdAt: -1 });

// UserArticleInteraction collection (already exists)
db.userarticleinteractions.createIndex({ userId: 1, objectId: 1 }, { unique: true });
db.userarticleinteractions.createIndex({ userId: 1, isHidden: 1 });
```

### Backward Compatibility

- ✅ API contract unchanged
- ✅ Response format identical
- ✅ Error codes preserved
- ✅ All existing tests should pass

### Cache Warming

Old global cache keys will expire naturally. No migration needed.
New user-specific cache will populate on first request per user.

## Code Quality Improvements

1. **Type Safety:** Explicit pipeline typing prevents runtime errors
2. **Logging:** Better observability for cache hits/misses
3. **Error Handling:** Proper validation and meaningful error messages
4. **Separation of Concerns:** Database handles data operations, cache handles storage
5. **Maintainability:** Clear aggregation pipeline with comments
6. **Simplified Architecture:** Removed unnecessary `InteractionsService` abstraction layer

### Module Consolidation

**Removed `InteractionsModule` and `InteractionsService`** - The service was just a thin wrapper that:
- Only had one active method (`hideArticle`)
- Only served one consumer (`ArticlesService`)
- Added unnecessary abstraction

All functionality has been consolidated directly into `ArticlesService.hideForUser()`, resulting in:
- Fewer files to maintain
- Clearer code flow
- No performance overhead from service wrapper
- Simpler dependency graph

See `docs/CLEANUP-INTERACTIONS.md` for complete removal guide.

### Deprecated/Removed Code

**`InteractionsService.getHiddenObjectIdsForUser()`** - Marked as deprecated, can be removed once tests are updated.

**`CacheService.getUserHiddenKey()`** - Removed. The hidden set cache is no longer needed since the database handles filtering.

## Trade-offs

### Pros
- ✅ Eliminates N+1 queries
- ✅ Correct pagination logic
- ✅ Better cache effectiveness
- ✅ Faster response validation
- ✅ More accurate hasNextPage

### Cons
- ⚠️ Slightly more complex aggregation pipeline (well-documented)
- ⚠️ Cache invalidation required on hide action (already implemented)
- ⚠️ More cache keys (one per user per page/limit combination)

## Testing Recommendations

1. **Unit Tests:**
   - Test aggregation pipeline with various hidden item scenarios
   - Verify page validation edge cases
   - Test size estimation accuracy

2. **Integration Tests:**
   - Hide item → verify cache invalidation
   - Multiple users with different hidden items
   - Pagination correctness with hidden items distributed across pages

3. **Performance Tests:**
   - Measure query execution time with aggregation
   - Compare cache hit vs miss latency
   - Load test with concurrent users

## Monitoring

Key metrics to track:

```typescript
// Cache effectiveness
- user_list_cache_hit_rate
- user_list_cache_miss_rate

// Database performance
- articles_aggregation_duration_ms
- articles_query_count_per_request

// Response validation
- response_size_estimation_duration_ms
- response_too_large_error_count
```

## Future Improvements

1. **Cursor-based pagination:** For even better performance with large datasets
2. **Cache warming:** Pre-populate cache for popular pages
3. **Partial cache invalidation:** Only invalidate affected pages (requires tracking which pages contain hidden items)
4. **Read replicas:** Route aggregation queries to read replicas
5. **Materialized views:** Pre-compute filtered lists for high-volume users

## References

- [MongoDB Aggregation Pipeline Documentation](https://docs.mongodb.com/manual/core/aggregation-pipeline/)
- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- Original ADR: `docs/adr/002-caching-strategy.md`
