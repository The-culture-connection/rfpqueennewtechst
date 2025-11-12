# Opportunities CSV Files

## 📁 File Organization

To optimize performance, organize your CSV files by funding type in the filename:

### Grants (keyword: "grant")
Place all grant-related opportunities in files with "grant" in the name:
- `grants.csv`
- `grants-2024.csv`
- `grantwatch.csv`
- `foundation-grants.csv`
- etc.

**Users who select "Grants" will only load these files.**

### RFPs (keyword: "rfp")
Place all RFP opportunities in files with "rfp" in the name:
- `rfp.csv`
- `rfp2.csv`
- `rfp-opportunities.csv`
- `philanthropy-rfps.csv`
- etc.

**Users who select "RFPs" will only load these files.**

### Government Contracts (keywords: "contract" or "sam")
Place all contract opportunities in files with "contract" or "sam" in the name:
- `contracts.csv`
- `gov-contracts.csv`
- `ContractOpportunities.csv`
- `SAM-contracts.csv`
- etc.

**Users who select "Government Contracts" will only load these files.**

---

## 🎯 How It Works

1. **User completes onboarding** and selects funding types (e.g., Grants + RFPs)
2. **System scans** the `Opportunities/` folder for CSV files
3. **Filters files** based on keywords in the filename matching selected funding types
4. **Only parses** the relevant CSV files
5. **Displays** matched opportunities to the user

---

## ⚡ Performance Benefits

Instead of loading all 64,000+ opportunities every time:
- **Grants only**: ~400 opportunities
- **RFPs only**: ~140 opportunities  
- **Contracts only**: ~64,600 opportunities
- **All three**: Full dataset

This dramatically reduces:
- ✅ Load time
- ✅ Memory usage
- ✅ Processing time
- ✅ Browser lag

---

## 📋 Current Files

Based on your current files:

| Current Filename | Detected As | Reason |
|-----------------|-------------|---------|
| `exports_grantwatch-2025-11-12.csv` | **Grants** | Contains "grant" |
| `grants-gov-opp-search--20251112161835.csv` | **Grants** | Contains "grant" |
| `exports_pnd-rfps-2025-11-12 (1).csv` | **RFPs** | Contains "rfp" |
| `exports_rfpmart-2025-11-12 (1).csv` | **RFPs** | Contains "rfp" |
| `exports_bidsusa-2025-11-12 (2).csv` | ❌ *Not matched* | Doesn't contain keywords |
| `ContractOpportunitiesFullCSV.csv` | **Contracts** | Contains "contract" |

### ⚠️ Action Required

The file `exports_bidsusa-2025-11-12 (2).csv` won't be loaded because it doesn't contain any keywords.

**Rename it to match your content:**
- If it contains RFPs: rename to `bidsusa-rfps-2025-11-12.csv`
- If it contains contracts: rename to `bidsusa-contracts-2025-11-12.csv`
- If it contains grants: rename to `bidsusa-grants-2025-11-12.csv`

---

## 🔄 Adding New Files

Simply drop new CSV files with appropriate keywords:

```bash
# Good names:
new-grants-december.csv           ✅ Matched as Grants
rfp-opportunities-2024.csv        ✅ Matched as RFPs
federal-contracts-latest.csv      ✅ Matched as Contracts

# Bad names (won't be matched):
opportunities.csv                 ❌ No keyword
bids-latest.csv                   ❌ No keyword
funding-sources.csv               ❌ No keyword
```

**No code changes needed!** Just use proper file naming.

---

## 💡 Pro Tips

1. **Use dates in filenames** for easy tracking: `grants-2024-12.csv`
2. **Include source in filename**: `grantwatch-export.csv`
3. **Separate by type clearly**: Don't mix grants and RFPs in one file
4. **Test after adding**: Check browser console to confirm file was loaded

---

## 📊 CSV Format

Your CSV files should have these columns (flexible):
- `Title` or `title`
- `Description` or `description`
- `Deadline` or `Close Date` or `closeDate`
- `Agency` or `Organization`
- `Amount` (optional)
- `City` / `State` (optional)
- `URL` or `Link` (optional)

The system automatically normalizes different column names!

