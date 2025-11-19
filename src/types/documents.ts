// Document types and extracted data structures

export type DocumentType = 
  // RFP Documents
  | 'sales-pitch-deck'
  | 'capability-statement'
  | 'executive-summary'
  | 'about-services'
  | 'recent-rfp-response'
  | 'articles-of-incorporation'
  | 'ein-tax-id'
  | 'business-license'
  | 'w9'
  | 'insurance-certificates'
  // Grant Documents
  | 'past-grant-proposal'
  | 'impact-report'
  | 'tax-financial-compliance'
  // Government Contract Documents
  | 'gov-capability-statement'
  | 'minority-business-certification';

export interface DocumentMetadata {
  id: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  fileType: string; // pdf, docx, jpg, png, etc.
  uploadedAt: string;
  storageUrl: string; // Firebase Storage URL
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedAt?: string;
}

// Extracted data structures based on document type

export interface SalesPitchDeckData {
  overview: string;
  mission: string;
  whoTheyServe: string;
  team: {
    name: string;
    title: string;
    bio?: string;
  }[];
  keyPersonnel: string[];
}

export interface CapabilityStatementData {
  services: string[];
  offerings: string[];
  capabilities: string[];
  naicsCodes?: string[]; // For government
  pastProjects?: string[];
}

export interface ExecutiveSummaryData {
  summary: string;
  keyPoints: string[];
}

export interface AboutServicesData {
  aboutUs: string;
  services: string[];
  differentiators: string[];
}

export interface RFPResponseData {
  projectApproach: string;
  methodology: string;
  pastPerformance: {
    projectName: string;
    client: string;
    description: string;
    outcome: string;
  }[];
  pricingInfo: string;
  rateInfo: string;
  riskLanguage?: string;
  qaLanguage?: string;
}

export interface LegalDocumentData {
  organizationName: string;
  address: string;
  einNumber?: string;
  taxId?: string;
  stateOfIncorporation?: string;
  dateOfIncorporation?: string;
  nonprofitStatus?: string;
}

export interface InsuranceData {
  generalLiability?: {
    provider: string;
    policyNumber: string;
    coverage: string;
    expirationDate: string;
  };
  professionalLiability?: {
    provider: string;
    policyNumber: string;
    coverage: string;
    expirationDate: string;
  };
  workersComp?: {
    provider: string;
    policyNumber: string;
    coverage: string;
    expirationDate: string;
  };
}

export interface GrantProposalData {
  mission: string;
  vision: string;
  organizationalOverview: string;
  programDescription: string;
  outcomes: string[];
  impactLanguage: string;
  evaluationApproach: string;
}

export interface ImpactReportData {
  impactMetrics: {
    metric: string;
    value: string;
    description: string;
  }[];
  stories: string[];
  caseStudies: {
    title: string;
    description: string;
    outcome: string;
  }[];
  budgetInfo?: string;
  useOfFunds?: string;
}

export interface TaxFinancialData {
  nonprofitStatus: string;
  organizationName: string;
  address: string;
  financialScale: string;
  revenueCategories: string[];
  expenseCategories: string[];
}

export interface MinorityBusinessData {
  certifications: string[];
  smallBusiness: boolean;
  minorityOwned: boolean;
  womenOwned: boolean;
  veteranOwned: boolean;
  certificationNumbers: string[];
}

// Main extracted data structure
export interface ExtractedDocumentData {
  documentId: string;
  documentType: DocumentType;
  rawText: string;
  
  // Structured data (only populated for relevant document types)
  salesPitchDeck?: SalesPitchDeckData;
  capabilityStatement?: CapabilityStatementData;
  executiveSummary?: ExecutiveSummaryData;
  aboutServices?: AboutServicesData;
  rfpResponse?: RFPResponseData;
  legalDocument?: LegalDocumentData;
  insurance?: InsuranceData;
  grantProposal?: GrantProposalData;
  impactReport?: ImpactReportData;
  taxFinancial?: TaxFinancialData;
  minorityBusiness?: MinorityBusinessData;
  
  extractedAt: string;
  confidence?: number; // 0-100, how confident the extraction was
}

// Document requirements by funding type
export const DOCUMENT_REQUIREMENTS = {
  rfps: [
    { type: 'sales-pitch-deck' as DocumentType, label: 'Sales Pitch Deck', required: true },
    { type: 'capability-statement' as DocumentType, label: 'Capability Statement', required: true },
    { type: 'executive-summary' as DocumentType, label: 'Executive Summary', required: false },
    { type: 'about-services' as DocumentType, label: '"About Us + Services" Sheet', required: false },
    { type: 'recent-rfp-response' as DocumentType, label: 'Most Recent RFP Response', required: false },
    { type: 'articles-of-incorporation' as DocumentType, label: 'Articles of Incorporation', required: true },
    { type: 'ein-tax-id' as DocumentType, label: 'EIN/Tax ID Letter', required: true },
    { type: 'business-license' as DocumentType, label: 'Business License', required: true },
    { type: 'w9' as DocumentType, label: 'W-9', required: true },
    { type: 'insurance-certificates' as DocumentType, label: 'Insurance Certificates', required: true },
  ],
  grants: [
    { type: 'past-grant-proposal' as DocumentType, label: 'Past Grant Proposal', required: true },
    { type: 'impact-report' as DocumentType, label: 'Impact Report', required: true },
    { type: 'tax-financial-compliance' as DocumentType, label: 'Tax/Financial Compliance File', required: true },
  ],
  contracts: [
    { type: 'gov-capability-statement' as DocumentType, label: 'Capability Statement or Gov-Facing Overview', required: true },
    { type: 'articles-of-incorporation' as DocumentType, label: 'Articles of Incorporation', required: true },
    { type: 'minority-business-certification' as DocumentType, label: 'Minority Business Certification', required: false },
  ],
};

// Helper to get document label
export function getDocumentLabel(type: DocumentType): string {
  for (const category of Object.values(DOCUMENT_REQUIREMENTS)) {
    const doc = category.find(d => d.type === type);
    if (doc) return doc.label;
  }
  return type;
}

// Helper to get required documents for funding type
export function getRequiredDocuments(fundingType: 'rfps' | 'grants' | 'contracts'): DocumentType[] {
  return DOCUMENT_REQUIREMENTS[fundingType]
    .filter(d => d.required)
    .map(d => d.type);
}

