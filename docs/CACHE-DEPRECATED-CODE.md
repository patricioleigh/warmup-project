# Deprecated Code in CacheService

## Summary

Yes, there is deprecated code in the `CacheService`. The **global list cache methods** are obsolete after the refactoring but still used in one place.

## Deprecated Methods

### 1. Global List Cache (Lines 141-188)

**Deprecated:**
```typescript
getGlobalListKey(page: number, limit: number): string
async getGlobalList<T>(page: number, limit: number): Promise<T | null>
async setGlobalList<T>(page, limit, value, ttlSeconds): Promise<boolean>
async invalidateGlobalList(): Promise<void>
```

**Reason:** We switched from global cache to user-specific cache. The global cache doesn't account for user-specific hidden items, which was one of the bugs we fixed.

**Status:** 
- ❌ `getGlobalList()` - NOT used in production (only in tests)
- ❌ `setGlobalList()` - NOT used in production (only in tests)
- ⚠️ `invalidateGlobalList()` - **Still used by `items.service.ts`** (incorrect!)
- ❌ `getGlobalListKey()` - Only used internally by deprecated methods

### 2. Redis Set Operations (Lines 70-111, 113-125)

**Potentially Deprecated:**
```typescript
async sadd(key: string, value: string): Promise<boolean>
async smembers(key: string): Promise<string[] | null>
async srem(key: string, value: string): Promise<boolean>
async exists(key: string): Promise<boolean | null>
async expire(key: string, ttlSeconds: number): Promise<boolean>
```

**Status:**
- Used internally by cache tracking (for global and user list keys)
- Still needed for user list cache key tracking
- ✅ Keep (actively used)

## The Problem

### In `items.service.ts` (Line 94):

```typescript
await this.cacheService.invalidateGlobalList();
```

This invalidates the **global** list cache, but we no longer use global cache! We now use **user-specific** cache, so this invalidation is ineffective.

### What Should Happen:

When new items are synced from HackerNews:
1. All user-specific list caches should be invalidated
2. Each user will get fresh data on their next request
3. New items will appear in everyone's feed

### Current Bug:

- Global cache (which doesn't exist anymore) is invalidated ✅
- User-specific caches are NOT invalidated ❌
- Users continue to see old cached data until TTL expires ❌

## The Fix

We need to invalidate **all user list caches** when new items are synced.

### Option 1: Invalidate All User Caches (Recommended)

Add a method to `CacheService`:

```typescript
/**
 * Invalidate all user list caches
 * Use this when global data changes (e.g., new items synced from HN)
 */
async invalidateAllUserLists(): Promise<void> {
  const client = this.getRedisClient();
  if (!client) {
    this.logger.debug({ msg: 'Cannot invalidate: Redis client not available' });
    return;
  }

  try {
    // Find all keys matching pattern: user:*:list:keys
    const scan = client.scan ?? client.SCAN;
    if (typeof scan !== 'function') {
      this.logger.warn({ msg: 'SCAN not available, cannot invalidate all user lists' });
      return;
    }

    // Use SCAN to find all user list key tracking sets
    const pattern = 'user:*:list:keys';
    const userListKeysKeys: string[] = [];
    
    let cursor = '0';
    do {
      const result = await scan.call(client, cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      userListKeysKeys.push(...result[1]);
    } while (cursor !== '0');

    if (userListKeysKeys.length === 0) {
      this.logger.debug({ msg: 'No user list caches to invalidate' });
      return;
    }

    // For each user, get their cached page keys and delete them
    for (const keysKey of userListKeysKeys) {
      const keys = await this.smembers(keysKey);
      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key) => this.del(key)));
      }
      await this.del(keysKey);
    }

    this.logger.log({
      msg: 'Invalidated all user list caches',
      userCount: userListKeysKeys.length,
    });
  } catch (err: any) {
    this.logger.error({
      msg: 'Failed to invalidate all user lists',
      error: err?.message ?? err,
    });
  }
}
```

### Option 2: Use Cache TTL (Current Behavior)

Keep the current approach but accept that caches will be stale until TTL expires (currently 3900 seconds = ~65 minutes).

**Pros:**
- Simple, no code changes
- Reduces Redis load

**Cons:**
- New items won't appear immediately for users
- Inconsistent UX (some users see new items, others don't)

### Option 3: Global Invalidation Flag

Set a global "data version" key that increments on sync, and check it before returning cached data.

**Too complex** for this use case.

## Recommended Actions

### 1. Add `invalidateAllUserLists()` to CacheService

See Option 1 above.

### 2. Update `items.service.ts`

Replace:
```typescript
await this.cacheService.invalidateGlobalList();
```

With:
```typescript
await this.cacheService.invalidateAllUserLists();
```

### 3. Mark Global Methods as Deprecated

Add JSDoc comments:

```typescript
/**
 * @deprecated Use user-specific cache methods instead.
 * This method is obsolete after refactoring to user-specific caching.
 * Can be removed once tests are updated.
 */
getGlobalListKey(page: number, limit: number): string {
  return `global_items_list:${page}:${limit}`;
}

/**
 * @deprecated Use getUserList() instead.
 * Can be removed once tests are updated.
 */
async getGlobalList<T>(page: number, limit: number): Promise<T | null> {
  // ...
}

/**
 * @deprecated Use setUserList() instead.
 * Can be removed once tests are updated.
 */
async setGlobalList<T>(...) {
  // ...
}

/**
 * @deprecated Use invalidateAllUserLists() instead.
 * This method no longer has any effect as global cache is not used.
 */
async invalidateGlobalList(): Promise<void> {
  // ...
}
```

### 4. Update Tests

Remove global cache mocks from `articles.service.spec.ts` and replace with user-specific cache mocks.

## Impact Analysis

### If We Do Nothing:

- ✅ No breakage (code still runs)
- ❌ Users see stale data for up to 65 minutes after new items are synced
- ❌ Confusing code (invalidates cache that doesn't exist)

### If We Fix It:

- ✅ Users see new items immediately after sync
- ✅ Clearer code intent
- ✅ Can eventually remove deprecated methods
- ⚠️ Slightly more Redis operations on sync (but sync only happens hourly)

## Conclusion

**Yes, there is deprecated code:**
1. Global list cache methods (lines 141-188)
2. Only `invalidateGlobalList()` is still called, but it's ineffective
3. Should be replaced with `invalidateAllUserLists()` for correct behavior

The fix is straightforward and will improve correctness without significant performance impact.
