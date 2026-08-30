export type UserRole = 'ADMIN' | 'DATA_OPERATOR' | 'VERIFIER' | 'VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  designation: string;
  avatarUrl?: string;
}

export type DocumentStatus =
  | 'UPLOADED'
  | 'PREPROCESSING'
  | 'OCR_PROCESSING'
  | 'AI_EXTRACTING'
  | 'VALIDATING'
  | 'AUTO_APPROVED'
  | 'PENDING_VERIFICATION'
  | 'VALIDATION_FAILED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ERROR';

export type SupportedLanguage =
  | 'English'
  | 'Hindi'
  | 'Bengali'
  | 'Marathi'
  | 'Gujarati'
  | 'Telugu'
  | 'Tamil'
  | 'Kannada'
  | 'Odia'
  | 'Punjabi';

export type ConfidenceCategory = 'HIGH' | 'MEDIUM' | 'LOW';

export type ValidationStatus = 'PASS' | 'FAIL' | 'WARNING';
export type ValidationSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface BoundingBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  page?: number;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string | number | null;
  confidence: number; // 0.00 to 1.00
  category: ConfidenceCategory;
  isVerified?: boolean;
  originalValue?: string | number | null;
  correctedValue?: string | number | null;
  isFlagged?: boolean;
  notes?: string;
  bbox?: BoundingBox;
}

export interface ValidationRuleResult {
  rule: string;
  ruleCode: string;
  status: ValidationStatus;
  message: string;
  severity: ValidationSeverity;
  fieldKey?: string;
}

export interface LandRecord {
  id: string;
  documentId: string;
  documentName: string;
  documentLanguage: 'English' | 'Hindi' | 'Bengali' | 'Bilingual';
  documentType: 'Record of Rights (RoR)' | 'Sale Deed' | 'Khasra-Khatauni' | '7/12 Extract' | 'Khatian' | 'Patta';
  
  // Structured core fields
  ownerName: string;
  fatherGuardianName: string;
  surveyNumber: string;
  khasraNumber: string;
  khataNumber: string;
  plotNumber: string;
  plotArea: number; // in standard acres / hectares
  plotAreaUnit: 'Acres' | 'Hectares' | 'Bigha' | 'Sq.Ft' | 'Guntha';
  village: string;
  tehsil: string;
  district: string;
  state: string;
  landClassification: 'Agricultural' | 'Non-Agricultural' | 'Residential' | 'Commercial' | 'Forest' | 'Government/Waste';
  ownershipType: 'Individual Freehold' | 'Joint Ownership' | 'Leasehold' | 'Ancestral / Coparcenary' | 'Trust / Institutional';
  mutationDetails: string;
  registrationNumber: string;
  documentDate: string;

  // Complete field map with confidence scores
  fields: Record<string, ExtractedField>;
  
  // Intelligence metrics
  overallConfidence: number;
  status: 'AUTO_APPROVED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'VALIDATION_FAILED';
  autoApproved: boolean;
  
  // Validation scorecard
  validationResults: ValidationRuleResult[];

  // GIS information
  latitude?: number;
  longitude?: number;
  polygonBoundary?: [number, number][]; // coordinates for map polygon

  // Human Verification metadata
  verifiedBy?: string;
  verifierName?: string;
  verifierComment?: string;
  verifiedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  fileType: 'pdf' | 'jpg' | 'jpeg' | 'png';
  fileSize: number;
  fileDataUrl: string; // Preview image / PDF representation
  language: 'English' | 'Hindi' | 'Bengali' | 'Bilingual';
  uploadedBy: string;
  uploadedByName: string;
  status: DocumentStatus;
  pageCount: number;
  rawOcrText?: string;
  recordId?: string;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationTask {
  id: string;
  recordId: string;
  documentId: string;
  documentName: string;
  ownerName: string;
  district: string;
  state: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CORRECTED';
  lowConfidenceFieldsCount: number;
  validationWarningsCount: number;
  overallConfidence: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'UPLOAD_DOCUMENT' | 'OCR_PROCESSED' | 'AI_EXTRACTED' | 'AUTO_APPROVED' | 'SUBMIT_FOR_VERIFICATION' | 'VERIFIER_EDIT' | 'VERIFIER_APPROVE' | 'VERIFIER_REJECT' | 'RULE_CONFIG_UPDATE' | 'RECORD_EXPORT';
  entityType: 'DOCUMENT' | 'LAND_RECORD' | 'VALIDATION_RULE' | 'SYSTEM';
  entityId: string;
  fieldKey?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  reason?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface ValidationRulesConfig {
  highConfidenceThreshold: number; // default 0.85
  mediumConfidenceThreshold: number; // default 0.60
  enableRequiredFieldsCheck: boolean;
  enableSurveyFormatCheck: boolean;
  enableKhataFormatCheck: boolean;
  enableAreaPositiveCheck: boolean;
  enableDuplicateRecordCheck: boolean;
  enableGeoHierarchyCheck: boolean;
  enableOwnerConsistencyCheck: boolean;
  enableMutationDateCheck: boolean;
  requiredFields: string[];
  maxAreaAcresLimit: number;
}

export interface DashboardStatistics {
  totalDocuments: number;
  documentsProcessed: number;
  successfullyDigitized: number;
  pendingVerification: number;
  validationFailures: number;
  avgConfidence: number;
  ocrSuccessRate: number;
  documentsProcessedToday: number;
  stateProgress: Array<{ state: string; total: number; verified: number; pending: number }>;
  districtProgress: Array<{ district: string; count: number; accuracy: number }>;
  confidenceDistribution: Array<{ name: string; value: number; color: string }>;
  timelineTrend: Array<{ date: string; scanned: number; autoApproved: number; manualVerified: number }>;
  errorDistribution: Array<{ errorType: string; count: number }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}
