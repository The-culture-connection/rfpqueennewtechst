# Text Scraper Method Without AI

## 1. Overall Non-AI Pipeline

Same pipeline for RFPs, grants, and gov contracts:

1. **User chooses document type at upload**
    - `sales_pitch_deck`
    - `capability_statement`
    - `rfx_response`
    - `past_grant_proposal`
    - `impact_report`
    - `gov_capability_statement`
    - `minority_cert_pdf`
    - etc.
2. **Extract text from file**
    - PDF → text: pdfplumber / pdf-parse / similar
    - DOCX → text: python-docx / mammoth
    - PPTX → text: extract slide titles + bullet content
3. **Normalize into sections**
    - Split into:
        - Pages
        - Lines
        - **Sections based on headings**
    - Heuristics for headings:
        - Lines in ALL CAPS
        - Lines that:
            - start with a number like `1.`, `2.1`, `I.`
            - end with `:`
            - are short (< 80 chars) but surrounded by longer text
    - Build a list like:
        
        ```jsx
        sections = [
          { heading: "Our Mission", body: "Our mission is to..." },
          { heading: "Services & Capabilities", body: "...bullet points..." },
          ...
        ]
        
        ```
        
4. **Field extractors** (pure rules)
    
    For each target field (`companyOverview`, `mission`, `services`, etc.):
    
    - Look through sections and pick:
        - best matching heading (keyword + score)
        - or fallback patterns in the raw text
5. **Store in Firebase**
    - Save both:
        - The raw sections
        - The extracted “best guess” for each field
    - Let the user review/edit in the UI.

---

## 2. Core Fields & How to Extract Them Without AI

You said you need fields like:

- Company overview
- Mission
- Services / capabilities
- Past performance
- Team experience
- Approach / methodology
- Pricing
- Certifications
- Problem, Solution

We’ll handle them with **rule sets** and **section scores**.

### General strategy for each field

For each field:

1. Define:
    - **Heading keywords** (for section titles)
    - **Body keywords** (for the paragraph itself)
2. When you parse a document into `sections`, compute a **score per section** for each field:
    
    ```jsx
    score = headingScore + bodyScore
    
    ```
    
3. Pick the top-scoring section for that field and store its body text.

You can make these keyword lists configurable per document type.

---

### A. Company Overview

**Where it usually lives:**

- First few slides or pages of:
    - sales pitch deck
    - capability statement
    - “About us” PDF
    - past RFP proposal

**Heading keywords:**

- `"about us"`, `"about [COMPANY]"`, `"company overview"`, `"who we are"`, `"our story"`, `"introduction"`

**Body keywords (soft):**

- `"founded"`, `"company"`, `"we are"`, `"our company"`, `"headquartered"`, `"serve"`

**Rule (rough):**

1. Look at first 2–3 sections of the file. If a heading matches any of the above, grab that as `companyOverview`.
2. If no headings, take the **first 1–2 paragraphs** that mention the company name.

---

### B. Mission

**Where it lives:**

- In decks: slide titled `"Mission"`, `"Our Mission"`, `"Mission & Vision"`
- In proposals: early section or about page.

**Heading keywords:**

- `"mission"`, `"our mission"`, `"mission & vision"`

**Body keywords (patterns):**

- `our mission is to`
- `the mission of`
- `we exist to`

**Rule:**

1. If a heading contains `"mission"` → mission = first paragraph under that heading.
2. Otherwise, search the entire text for patterns like `"our mission is"` and grab the sentence/paragraph around it.

---

### C. Services / Capabilities

**Where it lives:**

- Capability statement
- “Services” slide
- “What we do” section

**Heading keywords:**

- `"services"`, `"capabilities"`, `"what we do"`, `"our services"`, `"core competencies"`, `"solutions"`

**Body Keywords:**

- bullet-heavy sections, many commas; verbs like `"design"`, `"develop"`, `"consulting"`

**Rule:**

1. For each section:
    - +2 points if heading contains `"services"` or `"capabilities"`
    - +1 if heading contains `"solutions"`, `"what we do"`, `"competencies"`
2. Choose the highest scoring section and treat its bullet list or paragraphs as `servicesCapabilities`.

For PPTX: **services slide titles** are often literally `"Services"`, `"Our Services"`, etc.

---

### D. Past Performance

**Where it lives:**

- Most recent RFP response
- Gov capability statement
- Past grant proposal (as case studies / examples)

**Heading keywords:**

- `"past performance"`, `"experience"`, `"relevant projects"`, `"case studies"`, `"sample projects"`, `"clients served"`, `"previous work"`

**Body keywords:**

- `"client"`, `"project"`, `"outcomes"`, `"results"`, `"delivered"`, `"contract"`

**Rule:**

1. Scan sections for these headings; each match = +3.
2. Inside those sections, look for bullet lists with:
    - project name
    - client name
    - date/duration
3. Store the entire section as `pastPerformanceRaw`, maybe later parse into individual projects with regex on bullets.

---

### E. Team Experience

**Where it lives:**

- Sales deck
- Capability statement
- Org-oriented docs (board list for grants)

**Heading keywords:**

- `"our team"`, `"leadership"`, `"key personnel"`, `"management team"`, `"project team"`

**Body keywords:**

- `"CEO"`, `"founder"`, `"director"`, `"project manager"`, `"years of experience"`

**Rule:**

1. Find section with team heading.
2. If DOCX/PDF, treat each paragraph or bullet that looks like:
    
    `Name – Title – Short bio` as one `TeamMember`.
    
3. Store as list of objects:
    
    ```jsx
    teamExperience = [
      { name: "...", title: "...", rawBio: "..." },
      ...
    ]
    
    ```
    

---

### F. Approach / Methodology

**Where it lives:**

- Past RFP response
- Sometimes grant proposals

**Heading keywords:**

- `"approach"`, `"methodology"`, `"project approach"`, `"our approach"`, `"implementation plan"`, `"work plan"`, `"project plan"`, `"scope of work"`

**Body keywords:**

- `"phase"`, `"milestone"`, `"timeline"`, `"task"`, `"deliverable"`, `"we will"`

**Rule:**

1. Find section with these headings → treat as `approachMethodology`.
2. If multiple sections (e.g. “Phase 1”, “Phase 2”), either:
    - Concatenate as one long `approachMethodology` field, or
    - Store as array of phases.

---

### G. Pricing

**Where it lives:**

- Most recent RFP response
- Sales quotes
- Pricing sheet

**Indicators:**

- Tables with `$` or `%`
- Words:
    - `"pricing"`, `"fees"`, `"rate card"`, `"cost proposal"`, `"budget"`, `"financials"`

**Rule:**

1. Look for sections whose headings contain:
    - `"pricing"`, `"fees"`, `"cost"`, `"budgets"`, `"rate"`.
2. Also scan the whole file for:
    - lines with `$`
    - lines matching regex like `\d+(\.\d+)?\s?(per|/)\s?(hour|month|project)`
3. Combine these as `pricingRaw`.

You probably won’t perfectly parse tables without AI, but **even the raw blocks** are useful and can later be structured.

---

### H. Certifications

**Where they live:**

- Minority-business PDFs
- Cert packet
- Capability statement “Certs” box

**Heading keywords:**

- `"certifications"`, `"certified"`, `"MBE"`, `"WBE"`, `"DBE"`, `"SBE"`, `"8(a)"`, `"HUBZone"`, `"SDVOSB"`, `"WOSB"`, `"small business"`, `"minority-owned"`, `"women-owned"`

**Rule:**

1. Look for a section with `"certification"` in the heading.
2. Also regex search across text for the acronyms and phrases above.
3. Build a list like:
    
    ```jsx
    certifications = [
      "MBE – City of Cincinnati",
      "WBE – State of Ohio",
      "8(a) – SBA"
    ]
    
    ```
    
    even if you just capture the line where the keyword appears.
    

---

### I. Problem / Solution (for grants & RFPs)

**Problem (Need statement) heading keywords:**

- `"problem statement"`, `"need"`, `"community need"`, `"challenge"`, `"background"`

**Solution heading keywords:**

- `"solution"`, `"our solution"`, `"program description"`, `"proposed project"`, `"scope of work"`

**Rule:**

- For grants:
    - Problem = section headed `"Need"`, `"Statement of Need"`, `"Problem"`
    - Solution = `"Program Description"`, `"Project Description"`
- For RFP:
    - Solution = `"Proposed Solution"`, `"Our Approach"`, etc.

Store them as `problemStatement` and `proposedSolution`.

---

## 3. How to Implement Keyword Search Sanely (Not Just “Huge List of Words”)

Your instinct (“keyword search with a large list of keywords”) is right, but make it structured:

### For each field, define:

```jsx
fieldExtractors = {
  mission: {
    headingKeywords: ["mission", "mission & vision", "our mission"],
    bodyPatterns: ["our mission is", "the mission of"],
    maxLength: 800 // chars
  },
  services: {
    headingKeywords: ["services", "capabilities", "what we do", "solutions"],
    bodyPatterns: [],
    maxLength: 1200
  },
  ...
}

```

### Section scoring example:

```jsx
function scoreSectionForField(section, fieldConfig) {
  let score = 0;
  const heading = section.heading.toLowerCase();
  const body = section.body.toLowerCase();

  fieldConfig.headingKeywords.forEach(kw => {
    if (heading.includes(kw)) score += 5;
  });

  fieldConfig.bodyPatterns.forEach(p => {
    if (body.includes(p)) score += 3;
  });

  return score;
}

```

Then:

```jsx
function extractField(sections, fieldConfig) {
  let best = { score: 0, text: "" };

  sections.forEach(sec => {
    const s = scoreSectionForField(sec, fieldConfig);
    if (s > best.score) best = { score: s, text: sec.body };
  });

  return best.text.slice(0, fieldConfig.maxLength);
}

```

This is **100% non-AI** and pretty maintainable.

---

## 4. Dealing With the Hard Cases (Without AI)

Some documents will be messy (scans, no clear headings, weird formatting). For those:

- **Fallback strategies:**
    - Use location:
        - first X paragraphs in the deck → `companyOverview`
        - first text containing `"mission"` → mission
    - Use simple regex patterns:
        
        `"our mission is"` → grab the next 1–2 sentences
        
        `"we provide"` / `"we offer"` → services
        
- **User confirmation UI:**
    - Show your best guess per field and a “Change source section” dropdown.
    - Let them pick another section if your guess is wrong.

That still counts as **non-AI** automation: you accelerate 80% of the grunt work and let the user correct the remainder.

---

## 5. How This Fits Phase Two

For your **Phase 2: Text Extraction & Organization**:

1. **Implement extraction layer:**
    - Pipeline per file type → `sections[]`.
2. **Implement rule-based field extractors:**
    - As config objects like above.
    - Per file type you can tweak keyword weights (e.g., pitch deck vs past grant).
3. **Store in Firebase:**

```jsx
/users/{userId}/profile = {
  companyOverview: "...",
  mission: "...",
  services: "...",
  pastPerformanceRaw: "...",
  teamExperienceRaw: "...",
  approachMethodology: "...",
  pricingRaw: "...",
  certifications: ["MBE - City of X", "WBE - State of Y"],
  problemStatement: "...",
  proposedSolution: "..."
}

```

1. **Add a “Review Profile” screen in the app** where they can:
    - See what was extracted
    - Edit any field
    - Click “Save”