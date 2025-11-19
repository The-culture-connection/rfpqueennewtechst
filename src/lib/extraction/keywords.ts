// Field extraction keywords configuration
// Based on non-AI methodology

export interface FieldKeywords {
  heading: string[];
  body: string[];
  minBodyMatches?: number; // Minimum number of body keywords required
}

export const FIELD_KEYWORDS: Record<string, FieldKeywords> = {
  companyOverview: {
    heading: [
      "about us",
      "company overview",
      "who we are",
      "company profile",
      "introduction",
      "our company",
      "background",
      "overview",
      "welcome",
      "intro"
    ],
    body: [
      "our company",
      "we are",
      "founded in",
      "headquartered",
      "we serve",
      "providing services",
      "established in",
      "book rooms",
      "platform where"
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
      "practice areas",
      "competitive advantages",
      "advantages",
      "features"
    ],
    body: [
      "we provide",
      "we offer",
      "capabilities include",
      "services include",
      "core competencies",
      "our solutions",
      "first to market",
      "ease of use",
      "design",
      "incentive"
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
      "contract history",
      "competition",
      "competitors"
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
      "performed",
      "affordable",
      "expensive",
      "online",
      "offline"
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
      "pricing summary",
      "business model",
      "revenue model",
      "revenue"
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
      "unit price",
      "commission",
      "transaction",
      "per night",
      "$20",
      "$70",
      "$200m"
    ],
    minBodyMatches: 2 // Require at least 2 pricing signals to avoid false positives
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
      "the problem",
      "problem"
    ],
    body: [
      "the problem is",
      "faces challenges",
      "there is a lack of",
      "the community needs",
      "the issue is",
      "this population experiences",
      "concern for customers",
      "leave you disconnected",
      "no easy way"
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
      "program overview",
      "product"
    ],
    body: [
      "we will",
      "our solution",
      "the program will",
      "the project will",
      "our approach",
      "the initiative aims to",
      "web platform",
      "platform where users",
      "save money",
      "make money"
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
      "evaluation",
      "market size",
      "market validation",
      "market adoption",
      "traction"
    ],
    body: [
      "as a result",
      "this will lead to",
      "outcomes include",
      "will increase",
      "improve",
      "impact metrics",
      "total available market",
      "serviceable market",
      "market share",
      "trips booked",
      "billion"
    ]
  }
};

// Document type field hints - direct slide/section heading mapping
export const DOC_TYPE_FIELD_HINTS: Record<string, Record<string, string[]>> = {
  'sales-pitch-deck': {
    companyOverview: ["intro", "introduction", "welcome", "overview"],
    problemStatement: ["problem"],
    proposedSolution: ["solution", "product"],
    servicesCapabilities: ["competitive advantages", "competitive advantage", "advantages", "features"],
    pricing: ["business model", "revenue model", "revenue", "financials"],
    outcomesImpact: ["market validation", "market size", "market adoption", "traction"],
    pastPerformance: ["competition", "competitors"],
    teamExperience: ["team", "our team", "leadership"]
  },
  'capability-statement': {
    companyOverview: ["about us", "overview", "introduction"],
    servicesCapabilities: ["services", "capabilities", "what we do"],
    pastPerformance: ["past performance", "experience", "projects"],
    certifications: ["certifications", "certified"]
  },
  'past-grant-proposal': {
    companyOverview: ["organizational overview", "about us"],
    mission: ["mission", "vision"],
    problemStatement: ["need", "statement of need", "problem"],
    proposedSolution: ["program description", "project description", "solution"],
    outcomesImpact: ["outcomes", "impact", "expected outcomes"]
  }
};

// Optional: Field weights by document type
export const DOCUMENT_FIELD_WEIGHTS: Record<string, Record<string, number>> = {
  'sales-pitch-deck': {
    mission: 1.5,
    teamExperience: 1.3,
    servicesCapabilities: 1.2,
    problemStatement: 1.8,
    proposedSolution: 1.8,
    pricing: 1.5
  },
  'capability-statement': {
    servicesCapabilities: 2.0,
    certifications: 1.5
  },
  'most-recent-rfp-response': {
    approachMethodology: 2.0,
    pricing: 1.5,
    pastPerformance: 2.0
  },
  'past-grant-proposal': {
    problemStatement: 2.0,
    proposedSolution: 2.0,
    outcomesImpact: 1.5
  },
  'impact-report': {
    outcomesImpact: 2.0,
    pastPerformance: 1.5
  },
  'gov-capability-statement-overview': {
    servicesCapabilities: 2.0,
    pastPerformance: 1.8,
    certifications: 1.5
  }
};

