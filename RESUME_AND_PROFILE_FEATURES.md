# Resume Progress & Profile Editing Features

## 🎯 Two New Features Added

### 1. Resume Where You Left Off ✅
Users now automatically resume from their last viewed opportunity when they return to the dashboard.

### 2. Edit Profile Anytime ✅
Users can now update their profile preferences (funding types, interests, timeline, etc.) without creating a new account.

---

## 📍 Feature 1: Resume Progress

### How It Works

**Automatic Save:**
- Every time you pass, save, or apply to an opportunity, your position is saved
- Tracks which opportunity you're currently viewing
- Remembers all opportunities you've passed on

**Automatic Resume:**
- When you return to the dashboard, you pick up exactly where you left off
- Shows a blue banner: "Resumed from where you left off (Opportunity X)"
- All passed opportunities remain hidden

**Data Stored in Firestore:**
```
profiles/{userId}/dashboard/progress
  - currentOpportunityId: "abc123"
  - passedIds: ["id1", "id2", "id3"]
  - lastUpdated: "2025-11-12T10:30:00.000Z"
```

### User Experience

**Scenario 1: Mid-Session Navigation**
```
1. User reviews opportunities 1-10
2. Clicks "My Tracker" to check saved opportunities
3. Returns to dashboard
4. ✅ Resumes at opportunity 11 (where they left off)
```

**Scenario 2: Returning User**
```
1. User reviewed 50 opportunities yesterday
2. Logs in today
3. Dashboard loads
4. ✅ Shows: "Resumed from where you left off (Opportunity 51)"
5. Continues seamlessly
```

### Start Over Button

Users can reset their progress anytime:
- Click **"Start Over"** button in header
- Confirmation prompt appears
- Resets to opportunity #1
- Clears all passed opportunities
- Clears saved progress from Firestore

### Console Logging

Watch the browser console for progress tracking:
```
✅ Resumed from opportunity 25
💾 Progress saved: Opportunity 26
💾 Progress saved: Opportunity 27
✅ Progress reset
```

---

## ✏️ Feature 2: Edit Profile

### How to Access

**From Dashboard:**
- Click **"Edit Profile"** button (green) in the header

**From Tracker:**
- Click **"Edit Profile"** button in the header

### What You Can Edit

1. **Funding Types** - Select grants, RFPs, or contracts
2. **Timeline** - Immediate, 3 months, 6 months, or 12+ months
3. **Areas of Interest** - Healthcare, Education, Environment, etc.
4. **Organization Information** - Name and entity type

### User Interface

**Collapsed View (Default):**
- Shows current selections as tags/badges
- Clean, organized sections
- "Edit" button for each section

**Expanded View (When Editing):**
- Full onboarding component loads
- Same UI as initial signup
- Interactive selection/deselection
- Real-time updates

**Edit Mode:**
```
┌─────────────────────────────────────┐
│  Funding Types            [Edit]    │
├─────────────────────────────────────┤
│  ● grants  ● rfps                   │
└─────────────────────────────────────┘
         ↓ Click "Edit"
┌─────────────────────────────────────┐
│  Funding Types          [Collapse]  │
├─────────────────────────────────────┤
│  [Full selection UI appears]        │
│  □ Grants                           │
│  ☑ RFPs                             │
│  ☑ Contracts                        │
└─────────────────────────────────────┘
```

### Saving Changes

1. Edit any section(s) you want to update
2. Click **"Save Changes"** at the bottom
3. Profile updates in Firestore
4. Success alert appears
5. Redirects to dashboard
6. **New opportunities load** based on updated preferences!

### Impact on Opportunities

**When you change funding types:**
- Dashboard reloads opportunities
- Filters CSV files by new selections
- Matching algorithm recalculates win rates
- You see different opportunities immediately

**Example:**
```
Before: Selected "Grants" only → 400 opportunities
After:  Selected "Grants + RFPs" → 540 opportunities
```

---

## 🛠️ Technical Implementation

### File: `webapp/src/app/dashboard/page.tsx`

**Progress Loading:**
```typescript
// Load saved progress when opportunities are ready
useEffect(() => {
  async function loadProgress() {
    const progressRef = doc(db, 'profiles', user.uid, 'dashboard', 'progress');
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      const data = progressDoc.data();
      setPassedIds(data.passedIds || []);
      
      // Find and restore saved position
      const savedIndex = opportunities.findIndex(
        opp => opp.id === data.currentOpportunityId
      );
      if (savedIndex !== -1) {
        setCurrentIndex(savedIndex);
      }
    }
  }
  
  loadProgress();
}, [user, opportunities]);
```

**Progress Saving:**
```typescript
// Save progress whenever position changes
useEffect(() => {
  async function saveProgress() {
    if (!progressLoaded) return; // Don't save until initial load complete
    
    const progressRef = doc(db, 'profiles', user.uid, 'dashboard', 'progress');
    await setDoc(progressRef, {
      currentOpportunityId: currentOpportunity.id,
      passedIds: passedIds,
      lastUpdated: new Date().toISOString(),
    });
  }
  
  if (progressLoaded) {
    saveProgress();
  }
}, [currentIndex, passedIds, progressLoaded]);
```

### File: `webapp/src/app/profile/page.tsx`

**Profile Editor Structure:**
- Loads current profile data on mount
- Each section can be expanded/collapsed independently
- Uses same onboarding components for consistency
- Saves all fields at once on "Save Changes"

**State Management:**
```typescript
const [fundingTypes, setFundingTypes] = useState<FundingType[]>([]);
const [timeline, setTimeline] = useState<Timeline>('immediate');
const [interests, setInterests] = useState<Interest[]>([]);
const [entityName, setEntityName] = useState('');
const [entityType, setEntityType] = useState('');
const [activeSection, setActiveSection] = useState<string | null>(null);
```

---

## 🔄 Data Flow

### Resume Progress Flow

```
User Action (Pass/Save/Apply)
         ↓
State Updates (currentIndex, passedIds)
         ↓
useEffect Triggers
         ↓
Save to Firestore (dashboard/progress)
         ↓
User Navigates Away
         ↓
User Returns to Dashboard
         ↓
Load from Firestore
         ↓
Restore Position (setCurrentIndex, setPassedIds)
         ↓
Show Resume Banner
```

### Profile Edit Flow

```
Click "Edit Profile"
         ↓
Navigate to /profile
         ↓
Load Current Profile
         ↓
Display in Sections
         ↓
User Edits Sections
         ↓
Click "Save Changes"
         ↓
Update Firestore (profiles/{uid})
         ↓
Redirect to Dashboard
         ↓
Dashboard Reloads with New Profile
         ↓
New Opportunities Load (filtered by new preferences)
         ↓
Matching Algorithm Recalculates
```

---

## 🎨 UI Components

### Resume Banner
```tsx
{currentIndex > 0 && progressLoaded && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
    <p className="text-sm text-blue-800">
      Resumed from where you left off (Opportunity {currentIndex + 1})
    </p>
  </div>
)}
```

### Dashboard Header Buttons
- **My Tracker** (Blue) - View saved/applied opportunities
- **Edit Profile** (Green) - Update preferences
- **Start Over** (Yellow) - Reset progress
- **Logout** (Gray) - Sign out

### Profile Editor Sections
- Collapsible cards
- "Edit" / "Collapse" toggle
- Color-coded badges for current selections
- Full onboarding UI when expanded

---

## 🧪 Testing Scenarios

### Test Resume Progress

1. **Navigate Away Test:**
   - Review 5 opportunities
   - Go to Tracker
   - Return to Dashboard
   - ✅ Should show opportunity #6

2. **Logout/Login Test:**
   - Review 10 opportunities
   - Logout
   - Login again
   - Go to Dashboard
   - ✅ Should resume at opportunity #11

3. **Start Over Test:**
   - Be at opportunity #20
   - Click "Start Over"
   - Confirm
   - ✅ Should reset to opportunity #1
   - ✅ All passed opportunities should be visible again

### Test Profile Editing

1. **Edit Funding Types:**
   - Initial: "Grants" only
   - Edit profile → Add "RFPs"
   - Save
   - ✅ Dashboard should show grants + RFP opportunities

2. **Edit Timeline:**
   - Initial: "Immediate" (30 days)
   - Edit profile → Change to "12+ months"
   - Save
   - ✅ Different opportunities appear (different deadlines)

3. **Edit Interests:**
   - Initial: "Healthcare"
   - Edit profile → Add "Technology"
   - Save
   - ✅ Tech opportunities now included in matches

4. **Cancel Without Saving:**
   - Click "Edit Profile"
   - Make changes
   - Click "Cancel"
   - ✅ Changes should NOT be saved
   - ✅ Dashboard shows original opportunities

---

## 🔐 Firestore Structure

### Progress Document
```
profiles/{userId}/dashboard/progress
{
  currentOpportunityId: "opp_12345",
  passedIds: ["opp_001", "opp_002", "opp_003"],
  lastUpdated: "2025-11-12T15:30:00.000Z"
}
```

### Profile Document (Updated)
```
profiles/{userId}
{
  uid: "user123",
  email: "user@example.com",
  fundingType: ["grants", "rfps"],      // Can be edited
  timeline: "6-months",                  // Can be edited
  interestsMain: ["healthcare", "tech"], // Can be edited
  grantsByInterest: ["healthcare", "tech"],
  entityName: "My Organization",         // Can be edited
  entityType: "nonprofit",               // Can be edited
  createdAt: Timestamp,
  updatedAt: Timestamp                   // Updates on edit
}
```

---

## ⚙️ Configuration Options

### Resume Progress Settings

**Adjust save frequency** (currently saves on every position change):
```typescript
// To save less frequently, add debouncing:
const debouncedSave = useCallback(
  debounce(() => saveProgress(), 1000),
  [currentIndex]
);
```

**Clear progress after X days:**
```typescript
// Check if progress is stale
const progressAge = Date.now() - new Date(data.lastUpdated).getTime();
const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

if (progressAge > maxAge) {
  // Start fresh
  setCurrentIndex(0);
  setPassedIds([]);
}
```

---

## 💡 Benefits

### Resume Progress
✅ No frustration from losing place
✅ Seamless multi-session experience  
✅ Reduces cognitive load (don't remember where you were)
✅ Encourages thorough review over time
✅ Works across devices (saved in cloud)

### Profile Editing
✅ Adapt to changing needs
✅ Refine preferences over time
✅ No need to create new account
✅ Immediate impact on opportunities
✅ Full control over matching algorithm

---

## 🚀 Future Enhancements (Optional)

1. **Progress Sync Across Devices**: Already works! (Firestore syncs automatically)
2. **Progress History**: Track which opportunities viewed when
3. **Bookmarks**: Mark specific opportunities to return to
4. **Notes**: Add private notes to opportunities
5. **Profile Presets**: Save multiple profile configurations
6. **A/B Testing**: Compare opportunities from different profiles

---

## 📍 Navigation

- `/dashboard` - Main opportunity dashboard (resumes progress)
- `/tracker` - Saved and applied opportunities
- `/profile` - Edit profile preferences
- `/` - Landing/Logout

---

**Both features are now live!** 🎉

Test them out:
1. Review some opportunities
2. Navigate away and come back (should resume)
3. Click "Edit Profile" to update preferences
4. Click "Start Over" if you want to reset

All progress is saved to Firestore and persists across sessions!

