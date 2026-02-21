# Firestore Index Strategy

## Required Indexes

### userMatches Collection
```
Collection: userMatches/{uid}/runs/{runId}
Indexes needed:
- userId (ascending) + createdAt (descending) - for querying user's match runs by date
- userId (ascending) + status (ascending) - for filtering by status
```

### userOpportunitySignals Collection
```
Collection: userOpportunitySignals/{uid}/signals/{opportunityId}
Indexes needed:
- userId (ascending) + status (ascending) - for querying signals by status
- userId (ascending) + lastActionAt (descending) - for recent activity
```

### opportunities Collection (if storing normalized)
```
Collection: opportunities/{opportunityId}
Indexes needed:
- closeDate (ascending) - for filtering by deadline
- type (ascending) + closeDate (ascending) - for filtering by type and deadline
- source (ascending) - for filtering by source
```

### users Collection
```
Collection: users/{uid}
Indexes needed:
- profileVersion (ascending) - for version tracking queries
- docsVersion (ascending) - for version tracking queries
```

## Index Creation Commands

Run these in Firebase Console → Firestore → Indexes, or use Firebase CLI:

```bash
# userMatches runs index
firebase firestore:indexes create --indexes '[
  {
    "collectionGroup": "runs",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "createdAt", "order": "DESCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" }
    ]
  }
]'

# userOpportunitySignals index
firebase firestore:indexes create --indexes '[
  {
    "collectionGroup": "signals",
    "queryScope": "COLLECTION",
    "fields": [
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "lastActionAt", "order": "DESCENDING" }
    ]
  }
]'
```

## Query Patterns

### Get user's latest match run
```typescript
db.collection('userMatches')
  .doc(userId)
  .collection('runs')
  .orderBy('createdAt', 'desc')
  .limit(1)
```

### Get user's passed opportunities
```typescript
db.collection('userOpportunitySignals')
  .doc(userId)
  .collection('signals')
  .where('status', '==', 'passed')
  .orderBy('lastActionAt', 'desc')
```

### Get opportunities with upcoming deadlines
```typescript
db.collection('opportunities')
  .where('closeDate', '>=', today)
  .orderBy('closeDate', 'asc')
```
