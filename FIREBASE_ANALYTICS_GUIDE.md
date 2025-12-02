# Firebase Analytics Implementation Guide

## Overview

This document outlines the comprehensive Firebase Analytics tracking implementation for the RFP Matcher webapp. The analytics are designed to:
1. **Track user experience** - Identify pain points and optimize user flows
2. **Measure engagement** - Understand how users interact with features
3. **Identify monetization opportunities** - Track premium feature usage and conversion points

## Setup

### Prerequisites

1. Firebase Analytics must be enabled in your Firebase project
2. `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` must be set in your environment variables
3. The Firebase Analytics SDK is already included in `package.json` (via `firebase` package)

### Initialization

Analytics is automatically initialized in `src/lib/firebase.ts` when:
- Running in browser environment (`typeof window !== 'undefined'`)
- `measurementId` is available in Firebase config

## Tracked Events

### 🔐 Authentication Events

| Event Name | Parameters | When Tracked | Purpose |
|------------|-----------|---------------|---------|
| `sign_up` | `method: 'email'` | User creates new account | Track conversion funnel |
| `login` | `method: 'email'` | User logs in | Measure user retention |
| `logout` | None | User logs out | Track session end |

**Location**: `src/components/AuthProvider.tsx`

---

### 📝 Onboarding Events

| Event Name | Parameters | When Tracked | Purpose |
|------------|-----------|---------------|---------|
| `onboarding_started` | None | User lands on onboarding page | Track funnel entry |
| `onboarding_step_completed` | `step_number`, `step_name` | User completes each step | Identify drop-off points |
| `onboarding_funding_type_selected` | `funding_types`, `funding_types_count` | Step 1: User selects funding types | Understand user preferences |
| `onboarding_timeline_selected` | `timeline` | Step 2: User selects timeline | Track urgency preferences |
| `onboarding_interests_selected` | `interests`, `interests_count` | Step 3: User selects interests | Understand focus areas |
| `onboarding_entity_type_selected` | `entity_type` | Step 4: User selects entity type | Segment users by type |
| `onboarding_completed` | `entity_type`, `funding_types`, `timeline`, `interests_count` | User completes onboarding | Track conversion to active user |

**Location**: `src/app/onboarding/page.tsx`

**Key Metrics to Monitor**:
- Onboarding completion rate
- Step-by-step drop-off rates
- Most common funding type combinations
- Average time to complete onboarding

---

### 🎯 Dashboard & Opportunities Events

| Event Name | Parameters | When Tracked | Purpose |
|------------|-----------|---------------|---------|
| `dashboard_viewed` | `opportunities_count` | User views dashboard | Track engagement |
| `opportunity_viewed` | `opportunity_id`, `win_rate`, `opportunity_type`, `has_deadline` | User views an opportunity card | Measure engagement quality |
| `opportunity_passed` | `opportunity_id`, `win_rate`, `opportunity_type` | User clicks "Pass" | Identify low-quality matches |
| `opportunity_saved` | `opportunity_id`, `win_rate`, `opportunity_type`, `has_amount` | User clicks "Save" | Track high-value actions |
| `opportunity_applied` | `opportunity_id`, `win_rate`, `opportunity_type`, `has_amount` | User clicks "Apply" | Track primary conversion |
| `opportunity_url_clicked` | `opportunity_id` | User clicks external link | Track external engagement |
| `dashboard_start_over` | None | User resets progress | Track re-engagement |

**Location**: `src/app/dashboard/page.tsx`

**Key Metrics to Monitor**:
- Average opportunities viewed per session
- Save rate (saved / viewed)
- Apply rate (applied / viewed)
- Pass rate (passed / viewed)
- Average win rate of saved vs passed opportunities
- Correlation between win rate and user actions

**Monetization Insights**:
- Opportunities with high win rates that are saved → Premium feature: "Save more opportunities"
- High apply rate → Premium feature: "Auto-apply" or "Application templates"
- Users passing many opportunities → Premium feature: "Better matching algorithm"

---

### 📊 Tracker Events

| Event Name | Parameters | When Tracked | Purpose |
|------------|-----------|---------------|---------|
| `tracker_viewed` | `tab`, `count` | User views tracker page | Track feature usage |
| `tracker_tab_switched` | `tab` | User switches between Saved/Applied tabs | Understand user behavior |

**Location**: `src/app/tracker/page.tsx`

**Key Metrics to Monitor**:
- Tracker page views per user
- Ratio of saved to applied opportunities
- Time between saving and applying

**Monetization Insights**:
- Users with many saved opportunities → Premium feature: "Unlimited saves"
- Users with many applied opportunities → Premium feature: "Application tracking dashboard"

---

### 📁 Documents Events

| Event Name | Parameters | When Tracked | Purpose |
|------------|-----------|---------------|---------|
| `documents_page_viewed` | None | User views documents page | Track feature discovery |
| `document_upload_started` | `document_type` | User starts uploading | Track feature usage |
| `document_upload_completed` | `document_type`, `file_size_kb`, `file_type` | Upload succeeds | Track success rate |
| `document_upload_failed` | `document_type`, `error` | Upload fails | Identify technical issues |
| `document_processing_completed` | `document_type` | AI extraction completes | Track feature value |
| `document_processing_failed` | `document_type`, `error` | Processing fails | Identify issues |
| `document_replaced` | `document_type` | User replaces existing document | Track document management |

**Location**: `src/app/documents/page.tsx`

**Key Metrics to Monitor**:
- Document upload success rate
- Processing success rate
- Average file sizes
- Most uploaded document types
- Time to process documents

**Monetization Insights**:
- Document upload feature is highly used → Premium feature: "Unlimited document storage"
- Processing failures → Premium feature: "Priority processing" or "Manual review"
- Users uploading multiple documents → Premium feature: "Bulk upload"

---

### 👤 Profile Events

| Event Name | Parameters | When Tracked | Purpose |
|------------|-----------|---------------|---------|
| `profile_viewed` | None | User views profile page | Track feature usage |
| `profile_updated` | `updated_fields`, `updated_fields_count` | User updates profile | Track profile maintenance |

**Location**: `src/app/profile/page.tsx` (to be implemented)

---

### 💰 Monetization Events

| Event Name | Parameters | When Tracked | Purpose |
|------------|-----------|---------------|---------|
| `premium_feature_viewed` | `feature_name` | User views premium feature | Track interest |
| `premium_upgrade_prompt_shown` | `feature_name`, `location` | Upgrade prompt displayed | Track conversion funnel |
| `premium_upgrade_clicked` | `feature_name`, `location` | User clicks upgrade | Track conversion intent |
| `subscription_started` | `subscription_tier`, `price` | User subscribes | Track revenue |
| `subscription_cancelled` | `subscription_tier`, `cancellation_reason` | User cancels | Track churn |

**Location**: To be implemented when premium features are added

---

## User Properties

User properties are automatically set when a user profile is loaded:

| Property | Description | Example Values |
|----------|-------------|----------------|
| `entity_type` | User's organization type | `nonprofit`, `for-profit`, `government` |
| `funding_types` | Comma-separated funding types | `grants,rfps` |
| `timeline` | User's timeline preference | `immediate`, `3-months`, `6-months` |
| `interests_count` | Number of interests selected | `3`, `5`, `7` |
| `has_completed_onboarding` | Whether onboarding is complete | `true`, `false` |

**Location**: `src/components/AuthProvider.tsx` (via `setAnalyticsUserProperties`)

---

## Key Metrics to Track

### User Experience Metrics

1. **Onboarding Funnel**
   - Step 1 → Step 2 conversion rate
   - Step 2 → Step 3 conversion rate
   - Step 3 → Step 4 conversion rate
   - Step 4 → Completion rate
   - **Goal**: Identify where users drop off

2. **Engagement Metrics**
   - Average opportunities viewed per session
   - Average session duration
   - Opportunities viewed per user per day
   - **Goal**: Measure product stickiness

3. **Action Rates**
   - Save rate = (saved opportunities) / (viewed opportunities)
   - Apply rate = (applied opportunities) / (viewed opportunities)
   - Pass rate = (passed opportunities) / (viewed opportunities)
   - **Goal**: Understand user intent and match quality

4. **Feature Adoption**
   - % of users who upload documents
   - % of users who use tracker
   - Average documents uploaded per user
   - **Goal**: Identify most valuable features

### Monetization Metrics

1. **Conversion Funnel**
   - Users viewing premium features
   - Users clicking upgrade prompts
   - Users starting subscriptions
   - **Goal**: Track revenue conversion

2. **Feature Value Indicators**
   - Document upload → High value feature
   - High save rate → Users finding value
   - High apply rate → Users taking action
   - **Goal**: Identify what to monetize

3. **User Segmentation**
   - Power users (high engagement) → Premium candidates
   - Casual users (low engagement) → Free tier
   - **Goal**: Target right users for upgrades

---

## Recommended Firebase Analytics Reports

### 1. User Journey Report
**Path**: Analytics → Engagement → Paths
- Track: `onboarding_started` → `onboarding_completed` → `dashboard_viewed`
- **Insight**: Identify drop-off points in user journey

### 2. Event Count Report
**Path**: Analytics → Events
- Track: `opportunity_saved`, `opportunity_applied`, `opportunity_passed`
- **Insight**: Understand user behavior patterns

### 3. User Property Report
**Path**: Analytics → User Properties
- Track: `entity_type`, `funding_types`, `timeline`
- **Insight**: Segment users and personalize experience

### 4. Conversion Funnel
**Path**: Analytics → Conversions → Create Funnel
- Steps: `sign_up` → `onboarding_completed` → `opportunity_saved` → `opportunity_applied`
- **Insight**: Track end-to-end conversion

### 5. Retention Report
**Path**: Analytics → Engagement → Retention
- Track: Users who `login` multiple times
- **Insight**: Measure product stickiness

---

## Monetization Opportunities Identified

Based on the analytics implementation, here are potential monetization features:

### 1. **Premium Matching Algorithm**
- **Trigger**: Users passing many opportunities (low match quality)
- **Feature**: AI-powered matching with better win rate predictions
- **Price**: $29/month

### 2. **Unlimited Saves**
- **Trigger**: Users saving many opportunities
- **Feature**: Remove save limits, organize into folders
- **Price**: $19/month

### 3. **Document Processing Priority**
- **Trigger**: Users uploading documents frequently
- **Feature**: Faster processing, priority support
- **Price**: $39/month

### 4. **Application Templates**
- **Trigger**: Users applying to many opportunities
- **Feature**: Pre-filled application templates, auto-fill from documents
- **Price**: $49/month

### 5. **Advanced Analytics Dashboard**
- **Trigger**: Power users with high engagement
- **Feature**: Custom reports, win rate trends, opportunity insights
- **Price**: $59/month

### 6. **Bulk Operations**
- **Trigger**: Users managing many opportunities
- **Feature**: Bulk save, bulk apply, bulk export
- **Price**: $29/month

---

## Implementation Checklist

- [x] Firebase Analytics initialization
- [x] Analytics utility functions
- [x] Authentication event tracking
- [x] Onboarding event tracking
- [x] Dashboard event tracking
- [x] Tracker event tracking
- [x] Documents event tracking
- [x] User properties tracking
- [ ] Profile page event tracking (when implemented)
- [ ] Premium feature event tracking (when implemented)
- [ ] Error tracking integration
- [ ] Session duration tracking

---

## Testing Analytics

### Development Testing

1. **Check Console Logs**
   - All events should log: `[Analytics] Event tracked: <event_name>`
   - If analytics is unavailable, logs will show: `[Analytics] Event (not tracked): <event_name>`

2. **Firebase Console**
   - Go to Firebase Console → Analytics → Events
   - Events should appear within 24 hours (real-time view available in DebugView)

3. **DebugView (Real-time)**
   - Enable debug mode in Firebase Console
   - Use Firebase DebugView to see events in real-time
   - **Note**: Requires additional setup for web apps

### Production Monitoring

1. **Event Volume**
   - Monitor event counts in Firebase Console
   - Ensure events are firing as expected

2. **User Properties**
   - Check user property values in Analytics → User Properties
   - Verify properties are set correctly

3. **Conversion Funnels**
   - Set up conversion funnels in Firebase Console
   - Monitor conversion rates over time

---

## Next Steps

1. **Monitor Initial Data** (Week 1-2)
   - Collect baseline metrics
   - Identify any missing events
   - Verify data quality

2. **Analyze User Behavior** (Week 3-4)
   - Identify drop-off points
   - Find most/least used features
   - Understand user segments

3. **Optimize Based on Data** (Month 2+)
   - Fix identified pain points
   - Improve low-performing features
   - A/B test improvements

4. **Implement Monetization** (Month 3+)
   - Add premium features based on analytics
   - Track conversion to paid plans
   - Optimize pricing based on user behavior

---

## Troubleshooting

### Events Not Appearing

1. **Check Environment Variables**
   - Verify `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is set
   - Check Firebase Console → Project Settings → General → Your apps

2. **Check Browser Console**
   - Look for analytics initialization errors
   - Verify events are being logged

3. **Check Firebase Console**
   - Events may take up to 24 hours to appear
   - Use DebugView for real-time testing

### User Properties Not Set

1. **Check User Profile**
   - Verify user profile is loaded in `AuthProvider`
   - Check that `setAnalyticsUserProperties` is called

2. **Check User ID**
   - Verify `setAnalyticsUserId` is called after login
   - Check Firebase Console → Analytics → Users

---

## Additional Resources

- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [Firebase Analytics Events](https://firebase.google.com/docs/reference/js/analytics)
- [Best Practices for Analytics](https://firebase.google.com/docs/analytics/best-practices)

---

## Questions or Issues?

If you encounter any issues with analytics tracking:
1. Check browser console for errors
2. Verify Firebase configuration
3. Review this guide for event names and parameters
4. Check Firebase Console for data availability

