# Keywords

Below is the full JavaScript/JSON-style config:

```jsx
const FIELD_KEYWORDS = {
  companyOverview: {
    heading: [
      "about us",
      "company overview",
      "who we are",
      "company profile",
      "introduction",
      "our company",
      "background",
      "overview"
    ],
    body: [
      "our company",
      "we are",
      "founded in",
      "headquartered",
      "we serve",
      "providing services",
      "established in"
    ]
  },

  mission: {
    heading: [
      "mission",
      "mission & vision",
      "our mission",
      "mission statement"
    ],
    body: [
      "our mission is",
      "the mission of",
      "we exist to"
    ]
  },

  vision: {
    heading: [
      "vision",
      "mission & vision",
      "our vision",
      "vision statement"
    ],
    body: [
      "our vision is",
      "we envision",
      "the vision of"
    ]
  },

  servicesCapabilities: {
    heading: [
      "services",
      "capabilities",
      "what we do",
      "our services",
      "core competencies",
      "solutions",
      "offerings",
      "practice areas"
    ],
    body: [
      "we provide",
      "we offer",
      "capabilities include",
      "services include",
      "core competencies",
      "our solutions"
    ]
  },

  pastPerformance: {
    heading: [
      "past performance",
      "experience",
      "relevant experience",
      "previous work",
      "case studies",
      "sample projects",
      "clients served",
      "project history",
      "contract history"
    ],
    body: [
      "client",
      "project",
      "scope",
      "delivered",
      "provided",
      "outcome",
      "results",
      "completion",
      "value of",
      "in partnership with",
      "performed"
    ]
  },

  teamExperience: {
    heading: [
      "team",
      "our team",
      "leadership",
      "key personnel",
      "management team",
      "staff",
      "organizational leadership",
      "project team"
    ],
    body: [
      "years of experience",
      "background",
      "expertise",
      "role",
      "director",
      "manager",
      "ceo",
      "founder"
    ]
  },

  approachMethodology: {
    heading: [
      "approach",
      "methodology",
      "project approach",
      "implementation plan",
      "work plan",
      "project plan",
      "scope of work",
      "delivery approach",
      "execution plan"
    ],
    body: [
      "phase",
      "milestone",
      "timeline",
      "deliverable",
      "we will",
      "process",
      "steps",
      "tasks"
    ]
  },

  pricing: {
    heading: [
      "pricing",
      "cost",
      "fees",
      "rate card",
      "cost proposal",
      "budget",
      "financials",
      "pricing summary"
    ],
    body: [
      "$",
      "per hour",
      "per project",
      "cost estimate",
      "rate",
      "fee",
      "materials",
      "labor",
      "unit price"
    ]
  },

  certifications: {
    heading: [
      "certifications",
      "certified",
      "company certifications",
      "business certifications",
      "compliance certifications"
    ],
    body: [
      "mbe",
      "wbe",
      "dbe",
      "sbe",
      "8(a)",
      "hubzone",
      "sdvosb",
      "vosb",
      "wosb",
      "small business",
      "minority-owned",
      "women-owned",
      "veteran-owned"
    ]
  },

  problemStatement: {
    heading: [
      "problem statement",
      "need",
      "statement of need",
      "challenge",
      "community need",
      "needs assessment",
      "the problem"
    ],
    body: [
      "the problem is",
      "faces challenges",
      "there is a lack of",
      "the community needs",
      "the issue is",
      "this population experiences"
    ]
  },

  proposedSolution: {
    heading: [
      "solution",
      "our solution",
      "proposed solution",
      "project description",
      "program description",
      "scope of work",
      "intervention strategy",
      "program overview"
    ],
    body: [
      "we will",
      "our solution",
      "the program will",
      "the project will",
      "our approach",
      "the initiative aims to"
    ]
  },

  outcomesImpact: {
    heading: [
      "outcomes",
      "impact",
      "expected outcomes",
      "project outcomes",
      "program outcomes",
      "impact data",
      "evaluation"
    ],
    body: [
      "as a result",
      "this will lead to",
      "outcomes include",
      "will increase",
      "improve",
      "impact metrics"
    ]
  }
};

```

---

# 🔎 **This Config Supports:**

- RFP extraction
- Grant extraction
- Government contract extraction
- Multi-file ingestion
- Rule-based (non-AI) section scoring
- A consistent schema for Firebase storage

---

# 🧩 **How You Use It in Code**

Each field has:

- `heading`: used for SECTION MATCHING
- `body`: used for CONTENT MATCH SCORING

Your pipeline:

1. **Extract sections → `{heading, body}` pairs**
2. For each field (e.g., `"mission"`):
    - Check if section heading contains any `headingKeywords`
    - Check if section body contains any `bodyKeywords`
    - Compute a score
3. Choose the highest-scoring section → save to Firebase

---

# 🟦 Example Scoring Logic (Use This)

```jsx
function scoreSection(section, field) {
  let score = 0;
  const h = section.heading.toLowerCase();
  const b = section.body.toLowerCase();

  field.heading.forEach(kw => {
    if (h.includes(kw)) score += 5;
  });

  field.body.forEach(kw => {
    if (b.includes(kw)) score += 2;
  });

  return score;
}

```

---

# 🟩 Example Extraction

```jsx
function extractBestMatch(sections, fieldName) {
  const field = FIELD_KEYWORDS[fieldName];
  let best = { score: 0, text: "" };

  sections.forEach(sec => {
    const score = scoreSection(sec, field);
    if (score > best.score) {
      best = { score, text: sec.body };
    }
  });

  return best.text;
}

```

---

# 🟣 Optional Bonus: Field Priority by Document Type

If you want even better accuracy, you can assign weighting per document:

Example:

```jsx
const DOCUMENT_FIELD_WEIGHTS = {
  sales_pitch_deck: {
    mission: 1.5,
    teamExperience: 1.3,
    servicesCapabilities: 1.2
  },
  capability_statement: {
    servicesCapabilities: 2.0,
    certifications: 1.5
  },
  past_rfp_response: {
    approachMethodology: 2.0,
    pricing: 1.5,
    pastPerformance: 2.0
  }
};

```