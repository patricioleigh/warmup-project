# Cleanup Guide: Removing Obsolete Interactions Module

## Status: Ready to Delete

After the articles service refactoring (ADR-003), the `InteractionsModule` and `InteractionsService` have become obsolete. All functionality has been consolidated into `ArticlesService`.

## What Has Been Done

✅ **Removed from Production Code:**
1. Removed `InteractionsModule` import from `AppModule`
2. Removed `InteractionsModule` import from `ArticlesModule`
3. Removed `InteractionsService` dependency from `ArticlesService`
4. Moved `hideArticle` logic directly into `ArticlesService.hideForUser()`
5. Removed obsolete `getUserHiddenKey()` method from `CacheService`

## Files That Can Be Safely Deleted

The entire `interactions` folder can now be deleted:

```
server/src/interactions/               ❌ DELETE ENTIRE FOLDER
├── interactions.module.ts              ❌ DELETE
├── interactions.service.ts             ❌ DELETE
├── interactions.service.spec.ts        ❌ DELETE
└── schemas/
    └── user-article-interaction.schema.ts   ❌ DELETE (moved to articles/schemas/)
```

**Schema has been moved** to `server/src/articles/schemas/user-article-interaction.schema.ts` where it logically belongs.

## Test Files to Update

Before deleting the module/service files, you need to update these test files:

### 1. `server/src/articles/articles.service.spec.ts`

**Remove:**
```typescript
import { InteractionsService } from '../interactions/interactions.service';

const mockInteractionsService = {
  getHiddenObjectIdsForUser: jest.fn(),
  hideArticle: jest.fn(),
};

// In providers:
{
  provide: InteractionsService,
  useValue: mockInteractionsService,
}
```

**Update test cases:**
- Remove all `interactionsService.getHiddenObjectIdsForUser.mockResolvedValue()` calls
- Update `hideForUser` tests to directly check database updates and cache invalidation
- Mock `CacheService.invalidateUserList()` instead

### 2. Delete `server/src/interactions/interactions.service.spec.ts`

This entire test file can be deleted since the service no longer exists.

## Why This Is Safe

1. **No External Dependencies:** Only `ArticlesService` used `InteractionsService`
2. **Functionality Preserved:** All logic has been moved to `ArticlesService.hideForUser()`
3. **Schema Still Available:** The `UserArticleInteraction` schema is still available for direct use
4. **Cache Simplified:** No more redundant hidden set cache; everything goes through user list cache

## Benefits of This Cleanup

1. **Simpler Architecture:** One less layer of abstraction
2. **Fewer Files:** Reduced codebase size
3. **Better Performance:** Direct database access, no service wrapper overhead
4. **Easier to Understand:** All article operations in one place
5. **Less Cache Complexity:** Removed obsolete cache keys

## Checklist for Complete Removal

- [x] Remove from `AppModule`
- [x] Remove from `ArticlesModule`
- [x] Remove dependency from `ArticlesService`
- [x] Move logic into `ArticlesService`
- [x] Remove obsolete cache methods
- [x] Move schema to `articles/schemas/`
- [ ] Update `articles.service.spec.ts` tests
- [ ] Delete `interactions.service.spec.ts`
- [ ] Delete entire `server/src/interactions/` folder
- [ ] Verify all tests pass
- [ ] Update this checklist when complete

## Migration Note for Other Developers

If anyone was planning to use `InteractionsService` for other features:

**Instead of:**
```typescript
import { InteractionsService } from './interactions/interactions.service';

// In your service
constructor(private interactions: InteractionsService) {}

await this.interactions.hideArticle({ userId, objectId });
```

**Do this:**
```typescript
import { UserArticleInteraction } from './articles/schemas/user-article-interaction.schema';
import { CacheService } from './cache/cache.service';

// In your module
MongooseModule.forFeature([
  { name: UserArticleInteraction.name, schema: UserArticleInteractionSchema }
])

// In your service
constructor(
  @InjectModel(UserArticleInteraction.name) 
  private userInteractions: Model<UserArticleInteraction>,
  private cacheService: CacheService,
) {}

// Direct database access
await this.userInteractions.findOneAndUpdate(
  { userId, objectId },
  { $set: { isHidden: true } },
  { upsert: true, new: true }
);

// Invalidate cache if needed
await this.cacheService.invalidateUserList(userId);
```

## Questions?

See ADR-003 for the full context of why this refactoring was done.
