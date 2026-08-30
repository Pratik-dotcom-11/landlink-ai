import bcrypt from 'bcryptjs';
import {
  AuditLog,
  DashboardStatistics,
  DocumentItem,
  ExtractedField,
  LandRecord,
  User,
  ValidationRulesConfig,
  VerificationTask
} from '../src/types.js';
import { DEFAULT_RULES_CONFIG, runValidationEngine } from './validationEngine.js';

// Global In-Memory Database Storage
export interface AppDatabase {
  users: User[];
  documents: DocumentItem[];
  records: LandRecord[];
  verificationTasks: VerificationTask[];
  auditLogs: AuditLog[];
  rulesConfig: ValidationRulesConfig;
}

// User credentials map (hashed in production flow)
export const USER_CREDENTIALS: Record<string, { passwordHash: string; user: User }> = {};

function initDefaultUsers() {
  const salt = bcrypt.genSaltSync(8);
  
  const defaultUsers: User[] = [
    {
      id: 'USR-ADMIN-01',
      name: 'Dr. Alok Verma',
      email: 'admin@dolr.gov.in',
      role: 'ADMIN',
      department: 'Department of Land Resources',
      designation: 'Chief Technology Director & State Registrar',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'USR-OP-02',
      name: 'Pooja Sharma',
      email: 'operator@dolr.gov.in',
      role: 'DATA_OPERATOR',
      department: 'Digital India Land Records Cell',
      designation: 'Senior Cadastral Data Operator',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'USR-VER-03',
      name: 'Sunil Kumar Banerjee',
      email: 'verifier@dolr.gov.in',
      role: 'VERIFIER',
      department: 'Land Revenue & Settlement Wing',
      designation: 'Tehsildar & Senior Revenue Verifier',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'USR-VIEW-04',
      name: 'Ananya Gupta',
      email: 'viewer@dolr.gov.in',
      role: 'VIEWER',
      department: 'Ministry of Rural Development',
      designation: 'Public Policy Researcher',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  ];

  for (const user of defaultUsers) {
    const defaultPassword = user.role.toLowerCase().replace('_', '') + '123';
    // e.g. admin123, dataoperator123 / operator123, verifier123, viewer123
    USER_CREDENTIALS[user.email] = {
      passwordHash: bcrypt.hashSync(defaultPassword, salt),
      user,
    };
    // Also support short alias operator123
    if (user.role === 'DATA_OPERATOR') {
      USER_CREDENTIALS['operator@dolr.gov.in'] = {
        passwordHash: bcrypt.hashSync('operator123', salt),
        user,
      };
    }
  }

  return defaultUsers;
}

// Generate realistic simulated deed preview SVGs
export function generateSampleDeedSvg(title: string, state: string, language: string, owner: string, survey: string, area: string, sealColor: string = '#1e3a8a'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="100%" height="100%">
    <defs>
      <pattern id="paper" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="#fdfbf7"/>
        <path d="M0 0h100v100H0z" fill="none" stroke="#f3efe6" stroke-width="0.5"/>
      </pattern>
    </defs>
    <!-- Parchment Paper Background -->
    <rect width="800" height="1100" fill="url(#paper)"/>
    <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#94a3b8" stroke-width="2"/>
    <rect x="35" y="35" width="730" height="1030" fill="none" stroke="#cbd5e1" stroke-width="1"/>

    <!-- Header & Government Emblem Simulation -->
    <circle cx="400" cy="95" r="35" fill="none" stroke="${sealColor}" stroke-width="2.5"/>
    <text x="400" y="85" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="700" fill="${sealColor}">GOVERNMENT OF INDIA</text>
    <text x="400" y="100" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800" fill="${sealColor}">सत्यमेव जयते</text>
    <text x="400" y="115" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" fill="${sealColor}">DEPARTMENT OF LAND RESOURCES</text>

    <!-- Document Header -->
    <text x="400" y="170" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="18" font-weight="800" fill="#0f172a">${title.toUpperCase()}</text>
    <text x="400" y="195" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#475569">GOVERNMENT OF ${state.toUpperCase()} • REVENUE DEPARTMENT</text>
    <line x1="80" y1="210" x2="720" y2="210" stroke="#cbd5e1" stroke-width="1.5"/>

    <!-- Metadata Section -->
    <rect x="80" y="230" width="640" height="70" fill="#f8fafc" stroke="#e2e8f0" rx="4"/>
    <text x="100" y="255" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#334155">Doc Ref: <tspan fill="#0284c7">DOLR-${state.substring(0,2).toUpperCase()}-2024-REC</tspan></text>
    <text x="420" y="255" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#334155">Language: <tspan fill="#0f172a">${language}</tspan></text>
    <text x="100" y="280" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#334155">Survey / Khasra No: <tspan fill="#0f172a">${survey}</tspan></text>
    <text x="420" y="280" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#334155">Digital Seal: <tspan fill="#16a34a">VERIFIED HASH</tspan></text>

    <!-- Table of Extract -->
    <rect x="80" y="325" width="640" height="380" fill="#ffffff" stroke="#94a3b8" stroke-width="1"/>
    
    <!-- Table Header -->
    <rect x="80" y="325" width="640" height="35" fill="#f1f5f9"/>
    <line x1="80" y1="360" x2="720" y2="360" stroke="#94a3b8"/>
    <text x="100" y="348" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" fill="#1e293b">Cadastral Field Description</text>
    <text x="360" y="348" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" fill="#1e293b">Official Record Entry</text>
    <text x="600" y="348" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" fill="#1e293b">Remarks</text>
    
    <!-- Column Lines -->
    <line x1="340" y1="325" x2="340" y2="705" stroke="#cbd5e1"/>
    <line x1="580" y1="325" x2="580" y2="705" stroke="#cbd5e1"/>

    <!-- Row 1 -->
    <text x="100" y="390" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#475569">Primary Landowner</text>
    <text x="360" y="390" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="#0f172a">${owner}</text>
    <text x="600" y="390" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748b">Verified Raiyat</text>
    <line x1="80" y1="410" x2="720" y2="410" stroke="#f1f5f9"/>

    <!-- Row 2 -->
    <text x="100" y="440" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#475569">Cadastral Survey / Khasra</text>
    <text x="360" y="440" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="#0f172a">${survey}</text>
    <text x="600" y="440" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748b">Village Map Plot</text>
    <line x1="80" y1="460" x2="720" y2="460" stroke="#f1f5f9"/>

    <!-- Row 3 -->
    <text x="100" y="490" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#475569">Plot Area / Measurement</text>
    <text x="360" y="490" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="#0f172a">${area}</text>
    <text x="600" y="490" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748b">Surveyed Boundary</text>
    <line x1="80" y1="510" x2="720" y2="510" stroke="#f1f5f9"/>

    <!-- Row 4 -->
    <text x="100" y="540" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#475569">Land Classification</text>
    <text x="360" y="540" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="#0f172a">Agricultural (Class-I Irrigated)</text>
    <text x="600" y="540" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748b">Standard Revenue</text>
    <line x1="80" y1="560" x2="720" y2="560" stroke="#f1f5f9"/>

    <!-- Row 5 -->
    <text x="100" y="590" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#475569">Tenure / Ownership Type</text>
    <text x="360" y="590" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="700" fill="#0f172a">Individual Freehold (Bhumi-Swami)</text>
    <text x="600" y="590" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748b">Clear Title</text>
    <line x1="80" y1="610" x2="720" y2="610" stroke="#f1f5f9"/>

    <!-- Row 6 -->
    <text x="100" y="640" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-weight="600" fill="#475569">Namantaran / Mutation</text>
    <text x="360" y="640" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" fill="#0f172a">Order dt 14-Aug-2021 by Sub-Registrar</text>
    <text x="600" y="640" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" fill="#64748b">Gazetted Entry</text>
    <line x1="80" y1="660" x2="720" y2="660" stroke="#f1f5f9"/>

    <!-- Official Stamps & Signatures -->
    <g transform="translate(100, 750)">
      <circle cx="80" cy="80" r="55" fill="none" stroke="#b91c1c" stroke-width="2" stroke-dasharray="4,2"/>
      <text x="80" y="65" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="700" fill="#b91c1c">SEAL OF TEHSILDAR</text>
      <text x="80" y="82" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="800" fill="#b91c1c">REVENUE WING</text>
      <text x="80" y="98" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="600" fill="#b91c1c">${state.toUpperCase()}</text>
    </g>

    <g transform="translate(480, 750)">
      <path d="M20 70 Q 60 20, 110 65 T 180 50" fill="none" stroke="#1e293b" stroke-width="2"/>
      <line x1="10" y1="90" x2="200" y2="90" stroke="#475569" stroke-width="1"/>
      <text x="105" y="110" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" font-weight="700" fill="#0f172a">Sub-Divisional Magistrate</text>
      <text x="105" y="125" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="500" fill="#64748b">Digital Verification Authority</text>
    </g>

    <!-- Footer Notice -->
    <text x="400" y="1010" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="10" fill="#94a3b8">INTELLIGENT LAND RECORD DIGITIZATION PROTOTYPE • DEPT OF LAND RESOURCES (DoLR) • DEMO DATA</text>
    <text x="400" y="1030" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="9" fill="#94a3b8">Doc SHA256: 8f9b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function initSeedData(): AppDatabase {
  const users = initDefaultUsers();

  const svg1 = generateSampleDeedSvg('7/12 Extract (Record of Rights)', 'Maharashtra', 'English / Marathi', 'Rajesh Vasantrao Deshmukh', '214/1A', '7.90 Acres (3.20 Ha)', '#047857');
  const svg2 = generateSampleDeedSvg('LR Khatian & Porcha Record', 'West Bengal', 'Bengali / English', 'Pravir Kumar Roy (প্রবীর কুমার রায়)', 'Dag 512/3', '1.72 Acres [Handwritten]', '#b45309');
  const svg3 = generateSampleDeedSvg('Khasra - Khatauni Adhikar Abhilekh', 'Madhya Pradesh', 'Hindi Devanagari', 'Ramesh Chandra Patidar (रमेश चन्द्र पाटीदार)', '184/2', '4.57 Acres (1.85 Ha)', '#1e3a8a');
  const svg4 = generateSampleDeedSvg('Cadastral Sale Deed & Title Record', 'Uttar Pradesh', 'Hindi / English', 'Vikramaditya Singh', 'Khasra 99/A', '3.10 Acres', '#7c2d12');

  const documents: DocumentItem[] = [
    {
      id: 'DOC-MH-2024-001',
      filename: 'Maharashtra_7_12_Extract_Wagholi_Pune.pdf',
      fileType: 'pdf',
      fileSize: 1420500,
      fileDataUrl: svg1,
      language: 'English',
      uploadedBy: 'USR-OP-02',
      uploadedByName: 'Pooja Sharma',
      status: 'AUTO_APPROVED',
      pageCount: 1,
      recordId: 'REC-MH-1001',
      processingTimeMs: 1420,
      createdAt: '2026-08-28T10:15:00Z',
      updatedAt: '2026-08-28T10:16:00Z',
    },
    {
      id: 'DOC-WB-2024-002',
      filename: 'WestBengal_LR_Khatian_Shantipur_Nadia.jpg',
      fileType: 'jpg',
      fileSize: 2840000,
      fileDataUrl: svg2,
      language: 'Bengali',
      uploadedBy: 'USR-OP-02',
      uploadedByName: 'Pooja Sharma',
      status: 'PENDING_VERIFICATION',
      pageCount: 1,
      recordId: 'REC-WB-1002',
      processingTimeMs: 1850,
      createdAt: '2026-08-29T04:20:00Z',
      updatedAt: '2026-08-29T04:22:00Z',
    },
    {
      id: 'DOC-MP-2024-003',
      filename: 'MadhyaPradesh_Khatauni_Khargone.png',
      fileType: 'png',
      fileSize: 1950000,
      fileDataUrl: svg3,
      language: 'Hindi',
      uploadedBy: 'USR-OP-02',
      uploadedByName: 'Pooja Sharma',
      status: 'AUTO_APPROVED',
      pageCount: 1,
      recordId: 'REC-MP-1003',
      processingTimeMs: 1280,
      createdAt: '2026-08-29T05:10:00Z',
      updatedAt: '2026-08-29T05:11:00Z',
    },
    {
      id: 'DOC-UP-2024-004',
      filename: 'UttarPradesh_Deed_Lucknow_Khasra99.pdf',
      fileType: 'pdf',
      fileSize: 3100000,
      fileDataUrl: svg4,
      language: 'Hindi',
      uploadedBy: 'USR-OP-02',
      uploadedByName: 'Pooja Sharma',
      status: 'AUTO_APPROVED',
      pageCount: 1,
      recordId: 'REC-UP-1004',
      processingTimeMs: 1640,
      createdAt: '2026-08-29T05:45:00Z',
      updatedAt: '2026-08-29T05:47:00Z',
    },
  ];

  const records: LandRecord[] = [
    {
      id: 'REC-MH-1001',
      documentId: 'DOC-MH-2024-001',
      documentName: 'Maharashtra_7_12_Extract_Wagholi_Pune.pdf',
      documentLanguage: 'English',
      documentType: '7/12 Extract',
      ownerName: 'Rajesh Vasantrao Deshmukh',
      fatherGuardianName: 'Vasantrao Shankarrao Deshmukh',
      surveyNumber: '214/1A',
      khasraNumber: 'Gat 214/1A',
      khataNumber: '345',
      plotNumber: 'P-214/A',
      plotArea: 7.90,
      plotAreaUnit: 'Acres',
      village: 'Wagholi',
      tehsil: 'Haveli',
      district: 'Pune',
      state: 'Maharashtra',
      landClassification: 'Agricultural',
      ownershipType: 'Individual Freehold',
      mutationDetails: 'Ferfar / Mutation 7812 dt 05/03/2019',
      registrationNumber: 'MH-PUN-HAV-2019-11209',
      documentDate: '2019-03-05',
      fields: {
        owner_name: { key: 'owner_name', label: 'Landowner Name', value: 'Rajesh Vasantrao Deshmukh', confidence: 0.96, category: 'HIGH', bbox: { x: 12, y: 18, width: 45, height: 4 } },
        father_guardian_name: { key: 'father_guardian_name', label: 'Father / Guardian Name', value: 'Vasantrao Shankarrao Deshmukh', confidence: 0.93, category: 'HIGH', bbox: { x: 12, y: 23, width: 40, height: 4 } },
        survey_number: { key: 'survey_number', label: 'Survey Number', value: '214/1A', confidence: 0.95, category: 'HIGH', bbox: { x: 58, y: 18, width: 30, height: 4 } },
        khasra_number: { key: 'khasra_number', label: 'Khasra Number', value: 'Gat 214/1A', confidence: 0.92, category: 'HIGH', bbox: { x: 58, y: 23, width: 30, height: 4 } },
        khata_number: { key: 'khata_number', label: 'Khata Number', value: '345', confidence: 0.94, category: 'HIGH', bbox: { x: 58, y: 28, width: 30, height: 4 } },
        plot_number: { key: 'plot_number', label: 'Plot Number', value: 'P-214/A', confidence: 0.89, category: 'HIGH', bbox: { x: 58, y: 33, width: 25, height: 4 } },
        plot_area: { key: 'plot_area', label: 'Plot Area', value: 7.90, confidence: 0.91, category: 'HIGH', bbox: { x: 12, y: 35, width: 25, height: 4 } },
        plot_area_unit: { key: 'plot_area_unit', label: 'Area Unit', value: 'Acres', confidence: 0.97, category: 'HIGH', bbox: { x: 38, y: 35, width: 18, height: 4 } },
        village: { key: 'village', label: 'Village / Mouza', value: 'Wagholi', confidence: 0.98, category: 'HIGH', bbox: { x: 12, y: 42, width: 35, height: 4 } },
        tehsil: { key: 'tehsil', label: 'Tehsil / Taluka', value: 'Haveli', confidence: 0.96, category: 'HIGH', bbox: { x: 48, y: 42, width: 25, height: 4 } },
        district: { key: 'district', label: 'District', value: 'Pune', confidence: 0.99, category: 'HIGH', bbox: { x: 74, y: 42, width: 20, height: 4 } },
        state: { key: 'state', label: 'State', value: 'Maharashtra', confidence: 0.99, category: 'HIGH', bbox: { x: 74, y: 47, width: 20, height: 4 } },
        land_classification: { key: 'land_classification', label: 'Land Classification', value: 'Agricultural', confidence: 0.94, category: 'HIGH', bbox: { x: 12, y: 54, width: 35, height: 4 } },
        ownership_type: { key: 'ownership_type', label: 'Ownership Type', value: 'Individual Freehold', confidence: 0.93, category: 'HIGH', bbox: { x: 50, y: 54, width: 35, height: 4 } },
        mutation_details: { key: 'mutation_details', label: 'Mutation Details', value: 'Ferfar / Mutation 7812 dt 05/03/2019', confidence: 0.91, category: 'HIGH', bbox: { x: 12, y: 62, width: 75, height: 5 } },
        registration_number: { key: 'registration_number', label: 'Registration Number', value: 'MH-PUN-HAV-2019-11209', confidence: 0.95, category: 'HIGH', bbox: { x: 12, y: 70, width: 35, height: 4 } },
        document_date: { key: 'document_date', label: 'Document Date', value: '2019-03-05', confidence: 0.96, category: 'HIGH', bbox: { x: 50, y: 70, width: 30, height: 4 } },
      },
      overallConfidence: 0.95,
      status: 'AUTO_APPROVED',
      autoApproved: true,
      validationResults: [
        { rule: 'Mandatory Land Record Fields', ruleCode: 'REQ_01', status: 'PASS', severity: 'LOW', message: 'All 7 mandatory fields are present and valid.' },
        { rule: 'Survey / Khasra Identifier Format Check', ruleCode: 'SRV_FMT_01', status: 'PASS', severity: 'LOW', message: 'Survey number 214/1A conforms to Maharashtra Land Revenue Code standards.' },
        { rule: 'Plot Area Positivity & Validity Check', ruleCode: 'AREA_01', status: 'PASS', severity: 'LOW', message: 'Plot area of 7.90 Acres is valid.' },
        { rule: 'Cadastral Duplicate Check', ruleCode: 'DUP_01', status: 'PASS', severity: 'LOW', message: 'No duplicate survey parcel found.' },
        { rule: 'Administrative Hierarchy Verification', ruleCode: 'GEO_01', status: 'PASS', severity: 'LOW', message: 'Pune is a valid district in Maharashtra.' },
      ],
      latitude: 18.5793,
      longitude: 73.9814,
      polygonBoundary: [
        [18.5780, 73.9800],
        [18.5810, 73.9805],
        [18.5815, 73.9830],
        [18.5785, 73.9825],
      ],
      createdAt: '2026-08-28T10:15:00Z',
      updatedAt: '2026-08-28T10:16:00Z',
    },
    {
      id: 'REC-WB-1002',
      documentId: 'DOC-WB-2024-002',
      documentName: 'WestBengal_LR_Khatian_Shantipur_Nadia.jpg',
      documentLanguage: 'Bengali',
      documentType: 'Khatian',
      ownerName: 'Pravir Kumar Roy (প্রবীর কুমার রায়)',
      fatherGuardianName: 'Sachindranath Roy (শচীন্দ্রনাথ রায়)',
      surveyNumber: '512/3',
      khasraNumber: 'Dag 512/3',
      khataNumber: 'Khatian 873',
      plotNumber: 'JL-42/Plot-512',
      plotArea: 1.72,
      plotAreaUnit: 'Acres',
      village: 'Shantipur (Mouza-42)',
      tehsil: 'Shantipur Block',
      district: 'Nadia',
      state: 'West Bengal',
      landClassification: 'Agricultural',
      ownershipType: 'Individual Freehold',
      mutationDetails: 'Mutation Case WB-NAD-2020-MUT-5819',
      registrationNumber: 'WB-NAD-DOC-2020-00441',
      documentDate: '2020-11-20',
      fields: {
        owner_name: { key: 'owner_name', label: 'Landowner Name', value: 'Pravir Kumar Roy (প্রবীর কুমার রায়)', confidence: 0.88, category: 'HIGH', bbox: { x: 12, y: 18, width: 45, height: 4 } },
        father_guardian_name: { key: 'father_guardian_name', label: 'Father / Guardian Name', value: 'Sachindranath Roy (শচীন্দ্রনাথ রায়)', confidence: 0.84, category: 'MEDIUM', bbox: { x: 12, y: 23, width: 40, height: 4 } },
        survey_number: { key: 'survey_number', label: 'Survey Number', value: '512/3', confidence: 0.91, category: 'HIGH', bbox: { x: 58, y: 18, width: 30, height: 4 } },
        khasra_number: { key: 'khasra_number', label: 'Khasra Number', value: 'Dag 512/3', confidence: 0.89, category: 'HIGH', bbox: { x: 58, y: 23, width: 30, height: 4 } },
        khata_number: { key: 'khata_number', label: 'Khata Number', value: 'Khatian 873', confidence: 0.93, category: 'HIGH', bbox: { x: 58, y: 28, width: 30, height: 4 } },
        plot_number: { key: 'plot_number', label: 'Plot Number', value: 'JL-42/Plot-512', confidence: 0.82, category: 'MEDIUM', bbox: { x: 58, y: 33, width: 25, height: 4 } },
        plot_area: { key: 'plot_area', label: 'Plot Area', value: 1.72, confidence: 0.54, category: 'LOW', isFlagged: true, notes: 'Faded script in handwritten Bangla column 6, requires human verification', bbox: { x: 12, y: 35, width: 25, height: 4 } },
        plot_area_unit: { key: 'plot_area_unit', label: 'Area Unit', value: 'Acres', confidence: 0.85, category: 'HIGH', bbox: { x: 38, y: 35, width: 18, height: 4 } },
        village: { key: 'village', label: 'Village / Mouza', value: 'Shantipur (Mouza-42)', confidence: 0.95, category: 'HIGH', bbox: { x: 12, y: 42, width: 35, height: 4 } },
        tehsil: { key: 'tehsil', label: 'Tehsil / Taluka', value: 'Shantipur Block', confidence: 0.92, category: 'HIGH', bbox: { x: 48, y: 42, width: 25, height: 4 } },
        district: { key: 'district', label: 'District', value: 'Nadia', confidence: 0.97, category: 'HIGH', bbox: { x: 74, y: 42, width: 20, height: 4 } },
        state: { key: 'state', label: 'State', value: 'West Bengal', confidence: 0.99, category: 'HIGH', bbox: { x: 74, y: 47, width: 20, height: 4 } },
        land_classification: { key: 'land_classification', label: 'Land Classification', value: 'Agricultural', confidence: 0.90, category: 'HIGH', bbox: { x: 12, y: 54, width: 35, height: 4 } },
        ownership_type: { key: 'ownership_type', label: 'Ownership Type', value: 'Individual Freehold', confidence: 0.88, category: 'HIGH', bbox: { x: 50, y: 54, width: 35, height: 4 } },
        mutation_details: { key: 'mutation_details', label: 'Mutation Details', value: 'Mutation Case WB-NAD-2020-MUT-5819', confidence: 0.86, category: 'HIGH', bbox: { x: 12, y: 62, width: 75, height: 5 } },
        registration_number: { key: 'registration_number', label: 'Registration Number', value: 'WB-NAD-DOC-2020-00441', confidence: 0.87, category: 'HIGH', bbox: { x: 12, y: 70, width: 35, height: 4 } },
        document_date: { key: 'document_date', label: 'Document Date', value: '2020-11-20', confidence: 0.91, category: 'HIGH', bbox: { x: 50, y: 70, width: 30, height: 4 } },
      },
      overallConfidence: 0.84,
      status: 'PENDING_VERIFICATION',
      autoApproved: false,
      validationResults: [
        { rule: 'Low Confidence Field Trigger', ruleCode: 'CONF_01', status: 'WARNING', severity: 'HIGH', message: 'Plot Area extraction confidence is 54% (below 60% threshold). Manual verifier review required.', fieldKey: 'plot_area' },
        { rule: 'Mandatory Land Record Fields', ruleCode: 'REQ_01', status: 'PASS', severity: 'LOW', message: 'All mandatory fields extracted.' },
        { rule: 'Administrative Hierarchy Verification', ruleCode: 'GEO_01', status: 'PASS', severity: 'LOW', message: 'Nadia is confirmed within West Bengal.' },
      ],
      latitude: 23.2505,
      longitude: 88.4346,
      polygonBoundary: [
        [23.2490, 88.4330],
        [23.2520, 88.4335],
        [23.2525, 88.4360],
        [23.2495, 88.4355],
      ],
      createdAt: '2026-08-29T04:20:00Z',
      updatedAt: '2026-08-29T04:22:00Z',
    },
    {
      id: 'REC-MP-1003',
      documentId: 'DOC-MP-2024-003',
      documentName: 'MadhyaPradesh_Khatauni_Khargone.png',
      documentLanguage: 'Hindi',
      documentType: 'Khasra-Khatauni',
      ownerName: 'Ramesh Chandra Patidar (रमेश चन्द्र पाटीदार)',
      fatherGuardianName: 'Ramlal Patidar (रामलाल पाटीदार)',
      surveyNumber: '184/2',
      khasraNumber: '184/2',
      khataNumber: '412/A',
      plotNumber: 'P-184',
      plotArea: 4.57,
      plotAreaUnit: 'Acres',
      village: 'Mandleshwar',
      tehsil: 'Maheshwar',
      district: 'Khargone',
      state: 'Madhya Pradesh',
      landClassification: 'Agricultural',
      ownershipType: 'Individual Freehold',
      mutationDetails: 'Namantaran 2021/NM-9428 dt 14-Aug-2021',
      registrationNumber: 'MP-KH-2021-09823',
      documentDate: '2021-08-14',
      fields: {
        owner_name: { key: 'owner_name', label: 'Landowner Name', value: 'Ramesh Chandra Patidar (रमेश चन्द्र पाटीदार)', confidence: 0.94, category: 'HIGH', bbox: { x: 12, y: 18, width: 45, height: 4 } },
        father_guardian_name: { key: 'father_guardian_name', label: 'Father / Guardian Name', value: 'Ramlal Patidar (रामलाल पाटीदार)', confidence: 0.91, category: 'HIGH', bbox: { x: 12, y: 23, width: 40, height: 4 } },
        survey_number: { key: 'survey_number', label: 'Survey Number', value: '184/2', confidence: 0.96, category: 'HIGH', bbox: { x: 58, y: 18, width: 30, height: 4 } },
        khasra_number: { key: 'khasra_number', label: 'Khasra Number', value: '184/2', confidence: 0.96, category: 'HIGH', bbox: { x: 58, y: 23, width: 30, height: 4 } },
        khata_number: { key: 'khata_number', label: 'Khata Number', value: '412/A', confidence: 0.89, category: 'HIGH', bbox: { x: 58, y: 28, width: 30, height: 4 } },
        plot_number: { key: 'plot_number', label: 'Plot Number', value: 'P-184', confidence: 0.87, category: 'HIGH', bbox: { x: 58, y: 33, width: 25, height: 4 } },
        plot_area: { key: 'plot_area', label: 'Plot Area', value: 4.57, confidence: 0.92, category: 'HIGH', bbox: { x: 12, y: 35, width: 25, height: 4 } },
        plot_area_unit: { key: 'plot_area_unit', label: 'Area Unit', value: 'Acres', confidence: 0.95, category: 'HIGH', bbox: { x: 38, y: 35, width: 18, height: 4 } },
        village: { key: 'village', label: 'Village / Mouza', value: 'Mandleshwar', confidence: 0.97, category: 'HIGH', bbox: { x: 12, y: 42, width: 35, height: 4 } },
        tehsil: { key: 'tehsil', label: 'Tehsil / Taluka', value: 'Maheshwar', confidence: 0.96, category: 'HIGH', bbox: { x: 48, y: 42, width: 25, height: 4 } },
        district: { key: 'district', label: 'District', value: 'Khargone', confidence: 0.98, category: 'HIGH', bbox: { x: 74, y: 42, width: 20, height: 4 } },
        state: { key: 'state', label: 'State', value: 'Madhya Pradesh', confidence: 0.99, category: 'HIGH', bbox: { x: 74, y: 47, width: 20, height: 4 } },
        land_classification: { key: 'land_classification', label: 'Land Classification', value: 'Agricultural', confidence: 0.95, category: 'HIGH', bbox: { x: 12, y: 54, width: 35, height: 4 } },
        ownership_type: { key: 'ownership_type', label: 'Ownership Type', value: 'Individual Freehold', confidence: 0.92, category: 'HIGH', bbox: { x: 50, y: 54, width: 35, height: 4 } },
        mutation_details: { key: 'mutation_details', label: 'Mutation Details', value: 'Namantaran 2021/NM-9428 dt 14-Aug-2021', confidence: 0.88, category: 'HIGH', bbox: { x: 12, y: 62, width: 75, height: 5 } },
        registration_number: { key: 'registration_number', label: 'Registration Number', value: 'MP-KH-2021-09823', confidence: 0.93, category: 'HIGH', bbox: { x: 12, y: 70, width: 35, height: 4 } },
        document_date: { key: 'document_date', label: 'Document Date', value: '2021-08-14', confidence: 0.94, category: 'HIGH', bbox: { x: 50, y: 70, width: 30, height: 4 } },
      },
      overallConfidence: 0.93,
      status: 'AUTO_APPROVED',
      autoApproved: true,
      validationResults: [
        { rule: 'Mandatory Land Record Fields', ruleCode: 'REQ_01', status: 'PASS', severity: 'LOW', message: 'All mandatory fields verified in Hindi script.' },
        { rule: 'Khasra Number Format Check', ruleCode: 'SRV_FMT_01', status: 'PASS', severity: 'LOW', message: '184/2 adheres to MP Land Revenue standard.' },
        { rule: 'Administrative Hierarchy Verification', ruleCode: 'GEO_01', status: 'PASS', severity: 'LOW', message: 'Khargone is confirmed in Madhya Pradesh.' },
      ],
      latitude: 22.1833,
      longitude: 75.6667,
      polygonBoundary: [
        [22.1810, 75.6650],
        [22.1850, 75.6655],
        [22.1855, 75.6685],
        [22.1815, 75.6680],
      ],
      createdAt: '2026-08-29T05:10:00Z',
      updatedAt: '2026-08-29T05:11:00Z',
    },
    {
      id: 'REC-UP-1004',
      documentId: 'DOC-UP-2024-004',
      documentName: 'UttarPradesh_Deed_Lucknow_Khasra99.pdf',
      documentLanguage: 'Hindi',
      documentType: 'Sale Deed',
      ownerName: 'Vikramaditya Singh',
      fatherGuardianName: 'Harish Chandra Singh',
      surveyNumber: '99/A',
      khasraNumber: 'Khasra 99/A',
      khataNumber: 'Khata 118',
      plotNumber: 'P-99/1',
      plotArea: 3.10,
      plotAreaUnit: 'Acres',
      village: 'Chinhat',
      tehsil: 'Lucknow Sadar',
      district: 'Lucknow',
      state: 'Uttar Pradesh',
      landClassification: 'Residential',
      ownershipType: 'Individual Freehold',
      mutationDetails: 'Deed Reg Book-1 Vol 2090 Page 14',
      registrationNumber: 'UP-LKO-2022-0941',
      documentDate: '2022-04-10',
      fields: {
        owner_name: { key: 'owner_name', label: 'Landowner Name', value: 'Vikramaditya Singh', confidence: 0.92, category: 'HIGH', bbox: { x: 12, y: 18, width: 45, height: 4 } },
        father_guardian_name: { key: 'father_guardian_name', label: 'Father / Guardian Name', value: 'Harish Chandra Singh', confidence: 0.88, category: 'HIGH', bbox: { x: 12, y: 23, width: 40, height: 4 } },
        survey_number: { key: 'survey_number', label: 'Survey Number', value: '99/A', confidence: 0.87, category: 'HIGH', bbox: { x: 58, y: 18, width: 30, height: 4 } },
        khasra_number: { key: 'khasra_number', label: 'Khasra Number', value: 'Khasra 99/A', confidence: 0.86, category: 'HIGH', bbox: { x: 58, y: 23, width: 30, height: 4 } },
        khata_number: { key: 'khata_number', label: 'Khata Number', value: 'Khata 118', confidence: 0.89, category: 'HIGH', bbox: { x: 58, y: 28, width: 30, height: 4 } },
        plot_number: { key: 'plot_number', label: 'Plot Number', value: 'P-99/1', confidence: 0.84, category: 'MEDIUM', bbox: { x: 58, y: 33, width: 25, height: 4 } },
        plot_area: { key: 'plot_area', label: 'Plot Area', value: 3.10, confidence: 0.89, category: 'HIGH', bbox: { x: 12, y: 35, width: 25, height: 4 } },
        plot_area_unit: { key: 'plot_area_unit', label: 'Area Unit', value: 'Acres', confidence: 0.95, category: 'HIGH', bbox: { x: 38, y: 35, width: 18, height: 4 } },
        village: { key: 'village', label: 'Village / Mouza', value: 'Chinhat', confidence: 0.92, category: 'HIGH', bbox: { x: 12, y: 42, width: 35, height: 4 } },
        tehsil: { key: 'tehsil', label: 'Tehsil / Taluka', value: 'Lucknow Sadar', confidence: 0.91, category: 'HIGH', bbox: { x: 48, y: 42, width: 25, height: 4 } },
        district: { key: 'district', label: 'District', value: 'Lucknow', confidence: 0.98, category: 'HIGH', bbox: { x: 74, y: 42, width: 20, height: 4 } },
        state: { key: 'state', label: 'State', value: 'Uttar Pradesh', confidence: 0.99, category: 'HIGH', bbox: { x: 74, y: 47, width: 20, height: 4 } },
        land_classification: { key: 'land_classification', label: 'Land Classification', value: 'Residential', confidence: 0.88, category: 'HIGH', bbox: { x: 12, y: 54, width: 35, height: 4 } },
        ownership_type: { key: 'ownership_type', label: 'Ownership Type', value: 'Individual Freehold', confidence: 0.90, category: 'HIGH', bbox: { x: 50, y: 54, width: 35, height: 4 } },
        mutation_details: { key: 'mutation_details', label: 'Mutation Details', value: 'Deed Reg Book-1 Vol 2090 Page 14', confidence: 0.85, category: 'HIGH', bbox: { x: 12, y: 62, width: 75, height: 5 } },
        registration_number: { key: 'registration_number', label: 'Registration Number', value: 'UP-LKO-2022-0941', confidence: 0.92, category: 'HIGH', bbox: { x: 12, y: 70, width: 35, height: 4 } },
        document_date: { key: 'document_date', label: 'Document Date', value: '2022-04-10', confidence: 0.94, category: 'HIGH', bbox: { x: 50, y: 70, width: 30, height: 4 } },
      },
      overallConfidence: 0.94,
      status: 'AUTO_APPROVED',
      autoApproved: true,
      validationResults: [
        { rule: 'Duplicate Cadastral Parcel Detection', ruleCode: 'DUP_01', status: 'PASS', severity: 'LOW', message: 'No cadastral overlap detected.' },
        { rule: 'Mandatory Land Record Fields', ruleCode: 'REQ_01', status: 'PASS', severity: 'LOW', message: 'All mandatory fields extracted.' },
        { rule: 'Administrative Hierarchy Verification', ruleCode: 'GEO_01', status: 'PASS', severity: 'LOW', message: 'Lucknow is confirmed in Uttar Pradesh.' },
      ],
      latitude: 26.8833,
      longitude: 81.0167,
      polygonBoundary: [
        [26.8820, 81.0150],
        [26.8850, 81.0155],
        [26.8855, 81.0185],
        [26.8825, 81.0180],
      ],
      createdAt: '2026-08-29T05:45:00Z',
      updatedAt: '2026-08-29T05:47:00Z',
    },
  ];

  const verificationTasks: VerificationTask[] = [
    {
      id: 'TASK-WB-001',
      recordId: 'REC-WB-1002',
      documentId: 'DOC-WB-2024-002',
      documentName: 'WestBengal_LR_Khatian_Shantipur_Nadia.jpg',
      ownerName: 'Pravir Kumar Roy (প্রবীর কুমার রায়)',
      district: 'Nadia',
      state: 'West Bengal',
      status: 'PENDING',
      lowConfidenceFieldsCount: 1,
      validationWarningsCount: 1,
      overallConfidence: 0.84,
      createdAt: '2026-08-29T04:22:00Z',
      updatedAt: '2026-08-29T04:22:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'AUD-001',
      timestamp: '2026-08-28T10:15:00Z',
      userId: 'USR-OP-02',
      userName: 'Pooja Sharma',
      userRole: 'DATA_OPERATOR',
      action: 'UPLOAD_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: 'DOC-MH-2024-001',
      reason: 'Uploaded Maharashtra 7/12 RoR for automated digitization.',
      ipAddress: '10.24.18.9',
    },
    {
      id: 'AUD-002',
      timestamp: '2026-08-28T10:16:00Z',
      userId: 'SYSTEM',
      userName: 'AI Digitization Pipeline (Gemini 3.7)',
      userRole: 'ADMIN',
      action: 'AUTO_APPROVED',
      entityType: 'LAND_RECORD',
      entityId: 'REC-MH-1001',
      reason: 'Record passed all validation rules with 95% confidence.',
      ipAddress: '127.0.0.1',
    },
    {
      id: 'AUD-003',
      timestamp: '2026-08-29T04:20:00Z',
      userId: 'USR-OP-02',
      userName: 'Pooja Sharma',
      userRole: 'DATA_OPERATOR',
      action: 'UPLOAD_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: 'DOC-WB-2024-002',
      reason: 'Uploaded West Bengal handwritten Khatian document.',
      ipAddress: '10.24.18.9',
    },
    {
      id: 'AUD-004',
      timestamp: '2026-08-29T04:22:00Z',
      userId: 'SYSTEM',
      userName: 'Validation Engine',
      userRole: 'ADMIN',
      action: 'SUBMIT_FOR_VERIFICATION',
      entityType: 'LAND_RECORD',
      entityId: 'REC-WB-1002',
      reason: 'Field "plot_area" has confidence 54% < 60% threshold. Sent to Verifier Sunil Kumar Banerjee.',
      ipAddress: '127.0.0.1',
    },
  ];

  return {
    users,
    documents,
    records,
    verificationTasks,
    auditLogs,
    rulesConfig: { ...DEFAULT_RULES_CONFIG },
  };
}

export class DatabaseService {
  private db: AppDatabase;

  constructor() {
    this.db = initSeedData();
  }

  resetDatabase(): AppDatabase {
    this.db = initSeedData();
    return this.db;
  }

  // Users
  getUsers(): User[] {
    return this.db.users;
  }

  getUserById(id: string): User | undefined {
    return this.db.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  // Documents
  getDocuments(): DocumentItem[] {
    return [...this.db.documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getDocumentById(id: string): DocumentItem | undefined {
    return this.db.documents.find((d) => d.id === id);
  }

  addDocument(doc: DocumentItem): DocumentItem {
    this.db.documents.unshift(doc);
    return doc;
  }

  updateDocument(id: string, updates: Partial<DocumentItem>): DocumentItem | undefined {
    const doc = this.getDocumentById(id);
    if (!doc) return undefined;
    Object.assign(doc, updates, { updatedAt: new Date().toISOString() });
    return doc;
  }

  // Land Records
  getRecords(): LandRecord[] {
    return [...this.db.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getRecordById(id: string): LandRecord | undefined {
    return this.db.records.find((r) => r.id === id);
  }

  addRecord(record: LandRecord): LandRecord {
    this.db.records.unshift(record);
    return record;
  }

  updateRecord(id: string, updates: Partial<LandRecord>): LandRecord | undefined {
    const record = this.getRecordById(id);
    if (!record) return undefined;
    Object.assign(record, updates, { updatedAt: new Date().toISOString() });
    return record;
  }

  // Verification Tasks
  getVerificationTasks(): VerificationTask[] {
    return [...this.db.verificationTasks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getVerificationTaskById(id: string): VerificationTask | undefined {
    return this.db.verificationTasks.find((t) => t.id === id);
  }

  getVerificationTaskByRecordId(recordId: string): VerificationTask | undefined {
    return this.db.verificationTasks.find((t) => t.recordId === recordId);
  }

  addVerificationTask(task: VerificationTask): VerificationTask {
    this.db.verificationTasks.unshift(task);
    return task;
  }

  updateVerificationTask(id: string, updates: Partial<VerificationTask>): VerificationTask | undefined {
    const task = this.getVerificationTaskById(id);
    if (!task) return undefined;
    Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    return task;
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return [...this.db.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.db.auditLogs.unshift(newLog);
    return newLog;
  }

  // Validation Config
  getRulesConfig(): ValidationRulesConfig {
    return this.db.rulesConfig;
  }

  updateRulesConfig(config: Partial<ValidationRulesConfig>): ValidationRulesConfig {
    Object.assign(this.db.rulesConfig, config);
    return this.db.rulesConfig;
  }

  // Dashboard Aggregates
  getDashboardStats(): DashboardStatistics {
    const docs = this.db.documents;
    const records = this.db.records;

    const totalDocuments = docs.length;
    const documentsProcessed = docs.filter((d) => d.status !== 'UPLOADED' && d.status !== 'PREPROCESSING').length;
    const successfullyDigitized = records.filter((r) => r.status === 'AUTO_APPROVED' || r.status === 'VERIFIED').length;
    const pendingVerification = this.db.verificationTasks.filter((t) => t.status === 'PENDING' || t.status === 'IN_REVIEW').length;
    const validationFailures = records.filter((r) => r.status === 'VALIDATION_FAILED' || r.status === 'REJECTED').length;

    const avgConfidence = records.length > 0
      ? Number((records.reduce((acc, r) => acc + r.overallConfidence, 0) / records.length * 100).toFixed(1))
      : 92.5;

    // State Breakdown
    const stateMap: Record<string, { total: number; verified: number; pending: number }> = {};
    for (const r of records) {
      if (!stateMap[r.state]) {
        stateMap[r.state] = { total: 0, verified: 0, pending: 0 };
      }
      stateMap[r.state].total++;
      if (r.status === 'AUTO_APPROVED' || r.status === 'VERIFIED') {
        stateMap[r.state].verified++;
      } else {
        stateMap[r.state].pending++;
      }
    }

    const stateProgress = Object.entries(stateMap).map(([state, data]) => ({
      state,
      ...data,
    }));

    // District Breakdown
    const districtMap: Record<string, { count: number; totalConf: number }> = {};
    for (const r of records) {
      if (!districtMap[r.district]) {
        districtMap[r.district] = { count: 0, totalConf: 0 };
      }
      districtMap[r.district].count++;
      districtMap[r.district].totalConf += r.overallConfidence;
    }

    const districtProgress = Object.entries(districtMap).map(([district, data]) => ({
      district,
      count: data.count,
      accuracy: Math.round((data.totalConf / data.count) * 100),
    }));

    // Confidence Distribution
    let highCount = 0;
    let medCount = 0;
    let lowCount = 0;

    for (const r of records) {
      if (r.overallConfidence >= 0.85) highCount++;
      else if (r.overallConfidence >= 0.60) medCount++;
      else lowCount++;
    }

    const confidenceDistribution = [
      { name: 'High Confidence (≥85%)', value: highCount, color: '#16a34a' },
      { name: 'Medium Confidence (60-84%)', value: medCount, color: '#ca8a04' },
      { name: 'Low Confidence (<60%)', value: lowCount, color: '#dc2626' },
    ];

    const timelineTrend = [
      { date: '25 Aug', scanned: 12, autoApproved: 10, manualVerified: 2 },
      { date: '26 Aug', scanned: 18, autoApproved: 14, manualVerified: 3 },
      { date: '27 Aug', scanned: 24, autoApproved: 19, manualVerified: 5 },
      { date: '28 Aug', scanned: 31, autoApproved: 26, manualVerified: 4 },
      { date: '29 Aug', scanned: totalDocuments, autoApproved: successfullyDigitized, manualVerified: pendingVerification },
    ];

    const errorDistribution = [
      { errorType: 'Low Area Confidence', count: 3 },
      { errorType: 'Duplicate Survey Warning', count: 2 },
      { errorType: 'Faded Ink / Tear', count: 4 },
      { errorType: 'Non-Standard Survey Format', count: 1 },
    ];

    return {
      totalDocuments,
      documentsProcessed,
      successfullyDigitized,
      pendingVerification,
      validationFailures,
      avgConfidence,
      ocrSuccessRate: 98.4,
      documentsProcessedToday: 4,
      stateProgress,
      districtProgress,
      confidenceDistribution,
      timelineTrend,
      errorDistribution,
    };
  }
}

export const dbService = new DatabaseService();
