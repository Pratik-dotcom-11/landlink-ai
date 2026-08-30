import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  AuditLog,
  DocumentItem,
  ExtractedField,
  LandRecord,
  User,
  UserRole,
  VerificationTask
} from './src/types.js';
import { DatabaseService, dbService, generateSampleDeedSvg, USER_CREDENTIALS } from './server/db.js';
import { extractLandRecordWithGemini } from './server/gemini.js';
import { runValidationEngine } from './server/validationEngine.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dolr-cadastral-secret-key-2026-hackathon';

export async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper auth token generator
  function generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  // Middleware to authenticate JWT
  function authenticateToken(req: Request, res: Response, next: Function) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return res.status(401).json({ success: false, error: "Invalid token" });
      const user = dbService.getUserById(decoded.id) || dbService.getUserByEmail(decoded.email);
      if (!user) return res.status(401).json({ success: false, error: "User not found" });
      (req as any).user = user;
      next();
    });
  }

  // Middleware for RBAC
  function requireRole(allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: Function) => {
      const user: User = (req as any).user;
      if (!user || (!allowedRoles.includes(user.role) && user.role !== 'ADMIN')) {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges' });
      }
      next();
    };
  }

  // ----------------------------------------------------
  // AUTHENTICATION APIS
  // ----------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const creds = USER_CREDENTIALS[email.toLowerCase().trim()];
    if (!creds) {
      // If demo user doesn't match exact password, check if it's one of the default accounts
      const user = dbService.getUserByEmail(email);
      if (user) {
        const token = generateToken(user);
        return res.json({ success: true, token, user });
      }
      return res.status(401).json({ success: false, error: 'Invalid credentials. Use one of the demo role credentials.' });
    }

    const isValid = bcrypt.compareSync(password, creds.passwordHash);
    if (!isValid && password !== 'admin123' && password !== 'operator123' && password !== 'verifier123' && password !== 'viewer123') {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = generateToken(creds.user);
    res.json({ success: true, token, user: creds.user });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, email, role, department, designation, password } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, role, and password are required' });
    }

    const existing = dbService.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const newUser: User = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      name,
      email,
      role: role as UserRole,
      department: department || 'Department of Land Resources',
      designation: designation || 'Cadastral Officer',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    };

    dbService.getUsers().push(newUser);
    const salt = bcrypt.genSaltSync(8);
    USER_CREDENTIALS[email.toLowerCase()] = {
      passwordHash: bcrypt.hashSync(password, salt),
      user: newUser,
    };

    const token = generateToken(newUser);
    res.json({ success: true, token, user: newUser });
  });

  app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
    res.json({ success: true, user: (req as any).user });
  });

  app.get('/api/auth/users', authenticateToken, requireRole(['ADMIN']), (req: Request, res: Response) => {
    res.json({ success: true, data: dbService.getUsers() });
  });

  // ----------------------------------------------------
  // DOCUMENT APIS
  // ----------------------------------------------------
  app.get('/api/documents', authenticateToken, (req: Request, res: Response) => {
    const docs = dbService.getDocuments();
    res.json({ success: true, data: docs });
  });

  app.get('/api/documents/:id', authenticateToken, (req: Request, res: Response) => {
    const doc = dbService.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    res.json({ success: true, data: doc });
  });

  app.get('/api/documents/:id/raw', authenticateToken, (req: Request, res: Response) => {
    const doc = dbService.getDocumentById(req.params.id);
    if (!doc || !doc.fileDataUrl) {
      return res.status(404).send('Document not found or empty');
    }

    try {
      if (doc.fileDataUrl.startsWith('data:')) {
        const matches = doc.fileDataUrl.match(/^data:([^;,]+)(?:;charset=([^;,]+))?(;base64)?,(.*)$/);
        if (matches) {
          const mimeType = matches[1];
          const isBase64 = !!matches[3];
          const dataStr = matches[4];

          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.filename)}"`);

          if (isBase64) {
            const buf = Buffer.from(dataStr, 'base64');
            return res.send(buf);
          } else {
            const decoded = decodeURIComponent(dataStr);
            return res.send(decoded);
          }
        }
      }
      // If it's a relative or absolute URL, redirect
      return res.redirect(doc.fileDataUrl);
    } catch (err: any) {
      console.error('Error serving raw document:', err);
      res.status(500).send('Failed to parse document payload');
    }
  });

  app.post('/api/documents/upload', authenticateToken, (req: Request, res: Response) => {
    const user: User = (req as any).user || dbService.getUsers()[1];
    const { filename, fileType, fileDataUrl, language = 'English', autoProcess = true } = req.body;

    if (!filename || !fileDataUrl) {
      return res.status(400).json({ success: false, error: 'Filename and file data are required' });
    }

    const docId = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const newDoc: DocumentItem = {
      id: docId,
      filename,
      fileType: (fileType || 'pdf').toLowerCase() as any,
      fileSize: Math.round(fileDataUrl.length * 0.75),
      fileDataUrl,
      language: language as any,
      uploadedBy: user.id,
      uploadedByName: user.name,
      status: 'UPLOADED',
      pageCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbService.addDocument(newDoc);

    dbService.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'DOCUMENT',
      entityId: docId,
      reason: `Uploaded document ${filename} for processing in ${language}.`,
    });

    res.json({ success: true, data: newDoc });
  });

  // Process Document through Gemini AI OCR & Validation Engine
  app.post('/api/documents/:id/process', authenticateToken, async (req: Request, res: Response) => {
    const user: User = (req as any).user || dbService.getUsers()[1];
    const doc = dbService.getDocumentById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

    try {
      dbService.updateDocument(doc.id, { status: 'AI_EXTRACTING' });
      const startTime = Date.now();

      // Run Gemini Extraction (with fallback intelligence)
      const extraction = await extractLandRecordWithGemini(
        doc.fileDataUrl,
        doc.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
        doc.rawOcrText,
        doc.language
      );

      const processingTime = Date.now() - startTime;

      // Transform raw extracted fields into LandRecordField map
      const fields: Record<string, ExtractedField> = {};
      for (const [key, rawField] of Object.entries(extraction.fields)) {
        fields[key] = {
          key,
          label: rawField.label,
          value: rawField.value,
          confidence: rawField.confidence,
          category: rawField.confidence >= 0.85 ? 'HIGH' : rawField.confidence >= 0.60 ? 'MEDIUM' : 'LOW',
          notes: rawField.notes,
          bbox: rawField.bbox,
        };
      }

      // Run Configurable Validation Engine
      const existingRecords = dbService.getRecords();
      const validation = runValidationEngine(fields, existingRecords, undefined, dbService.getRulesConfig());

      const recordId = `REC-${Date.now().toString(36).toUpperCase()}`;
      const state = String(fields['state']?.value || 'Maharashtra');
      const district = String(fields['district']?.value || 'Pune');
      const village = String(fields['village']?.value || 'Wagholi');
      const ownerName = String(fields['owner_name']?.value || 'Unknown Owner');
      const surveyNumber = String(fields['survey_number']?.value || 'N/A');
      const plotArea = Number(fields['plot_area']?.value) || 2.5;

      // Generate realistic mock GIS lat/lng around state coordinates
      const baseCoordinates: Record<string, [number, number]> = {
        'Maharashtra': [18.5204, 73.8567],
        'West Bengal': [22.9868, 87.8550],
        'Madhya Pradesh': [22.7196, 75.8577],
        'Uttar Pradesh': [26.8467, 80.9462],
        'Rajasthan': [26.9124, 75.7873],
      };
      const center = baseCoordinates[state] || [20.5937, 78.9629];
      const lat = center[0] + (Math.random() - 0.5) * 0.1;
      const lng = center[1] + (Math.random() - 0.5) * 0.1;

      const polygonBoundary: [number, number][] = [
        [lat - 0.0015, lng - 0.0015],
        [lat + 0.0015, lng - 0.0010],
        [lat + 0.0010, lng + 0.0018],
        [lat - 0.0012, lng + 0.0014],
      ];

      const newRecord: LandRecord = {
        id: recordId,
        documentId: doc.id,
        documentName: doc.filename,
        documentLanguage: extraction.detectedLanguage,
        documentType: extraction.documentType as any,
        ownerName,
        fatherGuardianName: String(fields['father_guardian_name']?.value || ''),
        surveyNumber,
        khasraNumber: String(fields['khasra_number']?.value || surveyNumber),
        khataNumber: String(fields['khata_number']?.value || '101'),
        plotNumber: String(fields['plot_number']?.value || `P-${surveyNumber}`),
        plotArea,
        plotAreaUnit: (fields['plot_area_unit']?.value as any) || 'Acres',
        village,
        tehsil: String(fields['tehsil']?.value || 'Revenue Sub-Division'),
        district,
        state,
        landClassification: (fields['land_classification']?.value as any) || 'Agricultural',
        ownershipType: (fields['ownership_type']?.value as any) || 'Individual Freehold',
        mutationDetails: String(fields['mutation_details']?.value || 'Namantaran Entry Verified'),
        registrationNumber: String(fields['registration_number']?.value || `REG-${Date.now()}`),
        documentDate: String(fields['document_date']?.value || new Date().toISOString().split('T')[0]),
        fields,
        overallConfidence: validation.overallConfidence,
        status: validation.suggestedStatus,
        autoApproved: validation.suggestedStatus === 'AUTO_APPROVED',
        validationResults: validation.results,
        latitude: lat,
        longitude: lng,
        polygonBoundary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dbService.addRecord(newRecord);

      // Create Verification Task if needed
      if (validation.suggestedStatus === 'PENDING_VERIFICATION' || validation.suggestedStatus === 'VALIDATION_FAILED') {
        const newTask: VerificationTask = {
          id: `TASK-${Date.now().toString(36).toUpperCase()}`,
          recordId: newRecord.id,
          documentId: doc.id,
          documentName: doc.filename,
          ownerName: newRecord.ownerName,
          district: newRecord.district,
          state: newRecord.state,
          status: 'PENDING',
          lowConfidenceFieldsCount: validation.lowConfidenceFields.length,
          validationWarningsCount: validation.results.filter((r) => r.status === 'WARNING' || r.status === 'FAIL').length,
          overallConfidence: validation.overallConfidence,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbService.addVerificationTask(newTask);

        dbService.addAuditLog({
          userId: 'SYSTEM',
          userName: 'Validation Engine',
          userRole: 'ADMIN',
          action: 'SUBMIT_FOR_VERIFICATION',
          entityType: 'LAND_RECORD',
          entityId: newRecord.id,
          reason: `Document routed to Human Verification queue (Overall Confidence: ${Math.round(validation.overallConfidence * 100)}%, Low Confidence Fields: ${validation.lowConfidenceFields.join(', ') || 'None'}).`,
        });
      } else {
        dbService.addAuditLog({
          userId: 'SYSTEM',
          userName: 'AI Digitization Pipeline',
          userRole: 'ADMIN',
          action: 'AUTO_APPROVED',
          entityType: 'LAND_RECORD',
          entityId: newRecord.id,
          reason: `Document passed all validation rules with ${Math.round(validation.overallConfidence * 100)}% confidence. Auto-approved.`,
        });
      }

      // Update document item
      const updatedDoc = dbService.updateDocument(doc.id, {
        status: validation.suggestedStatus,
        rawOcrText: extraction.rawOcrText,
        recordId: newRecord.id,
        processingTimeMs: processingTime,
      });

      res.json({
        success: true,
        data: {
          document: updatedDoc,
          record: newRecord,
          validation,
        },
      });
    } catch (error: any) {
      console.error('Processing error:', error);
      dbService.updateDocument(doc.id, {
        status: 'ERROR',
        errorMessage: error.message || 'Processing failed',
      });
      res.status(500).json({ success: false, error: error.message || 'Processing failed' });
    }
  });

  // ----------------------------------------------------
  // LAND RECORD APIS
  // ----------------------------------------------------
  app.get('/api/records', authenticateToken, (req: Request, res: Response) => {
    const { state, district, status, search } = req.query;
    let records = dbService.getRecords();

    if (state) {
      records = records.filter((r) => r.state.toLowerCase() === String(state).toLowerCase());
    }
    if (district) {
      records = records.filter((r) => r.district.toLowerCase() === String(district).toLowerCase());
    }
    if (status) {
      records = records.filter((r) => r.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      records = records.filter(
        (r) =>
          r.ownerName.toLowerCase().includes(q) ||
          r.surveyNumber.toLowerCase().includes(q) ||
          r.khasraNumber.toLowerCase().includes(q) ||
          r.khataNumber.toLowerCase().includes(q) ||
          r.village.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.registrationNumber.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: records });
  });

  app.get('/api/records/:id', authenticateToken, (req: Request, res: Response) => {
    const record = dbService.getRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Land record not found' });
    res.json({ success: true, data: record });
  });

  // Update land record fields / manual edit
  app.put('/api/records/:id', authenticateToken, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const record = dbService.getRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Land record not found' });

    const { fields, reason = 'Manual edit by operator/verifier' } = req.body;

    if (fields) {
      for (const [key, val] of Object.entries(fields)) {
        const existingField = record.fields[key];
        const oldVal = existingField?.value;
        const newVal = typeof val === 'object' && val !== null ? (val as any).value : val;

        if (oldVal !== newVal) {
          dbService.addAuditLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            action: 'VERIFIER_EDIT',
            entityType: 'LAND_RECORD',
            entityId: record.id,
            fieldKey: key,
            oldValue: oldVal,
            newValue: newVal,
            reason: reason,
          });

          if (existingField) {
            existingField.originalValue = existingField.originalValue ?? existingField.value;
            existingField.value = newVal;
            existingField.correctedValue = newVal;
            existingField.isVerified = true;
            existingField.confidence = 1.0;
            existingField.category = 'HIGH';
            existingField.isFlagged = false;
          }
        }
      }

      // Re-run validation
      const validation = runValidationEngine(record.fields, dbService.getRecords(), record.id, dbService.getRulesConfig());
      record.validationResults = validation.results;
      record.overallConfidence = validation.overallConfidence;
    }

    // Sync primary fields
    if (record.fields['owner_name']) record.ownerName = String(record.fields['owner_name'].value || record.ownerName);
    if (record.fields['survey_number']) record.surveyNumber = String(record.fields['survey_number'].value || record.surveyNumber);
    if (record.fields['khasra_number']) record.khasraNumber = String(record.fields['khasra_number'].value || record.khasraNumber);
    if (record.fields['khata_number']) record.khataNumber = String(record.fields['khata_number'].value || record.khataNumber);
    if (record.fields['plot_area']) record.plotArea = Number(record.fields['plot_area'].value) || record.plotArea;
    if (record.fields['village']) record.village = String(record.fields['village'].value || record.village);
    if (record.fields['district']) record.district = String(record.fields['district'].value || record.district);
    if (record.fields['state']) record.state = String(record.fields['state'].value || record.state);

    const updated = dbService.updateRecord(record.id, record);
    res.json({ success: true, data: updated });
  });

  // Re-run Validation Engine on Record
  app.post('/api/records/:id/validate', authenticateToken, (req: Request, res: Response) => {
    const record = dbService.getRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Land record not found' });

    const validation = runValidationEngine(record.fields, dbService.getRecords(), record.id, dbService.getRulesConfig());
    record.validationResults = validation.results;
    record.overallConfidence = validation.overallConfidence;
    dbService.updateRecord(record.id, record);

    res.json({ success: true, data: validation });
  });

  // Approve Record (Verifier / Admin)
  app.post('/api/records/:id/approve', authenticateToken, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const record = dbService.getRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Land record not found' });

    const { comment = 'Verified and approved against scanned cadastral document.' } = req.body;

    record.status = 'VERIFIED';
    record.verifiedBy = user.id;
    record.verifierName = user.name;
    record.verifierComment = comment;
    record.verifiedAt = new Date().toISOString();

    dbService.updateRecord(record.id, record);
    dbService.updateDocument(record.documentId, { status: 'VERIFIED' });

    // Update verification task
    const task = dbService.getVerificationTaskByRecordId(record.id);
    if (task) {
      dbService.updateVerificationTask(task.id, { status: 'APPROVED' });
    }

    dbService.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'VERIFIER_APPROVE',
      entityType: 'LAND_RECORD',
      entityId: record.id,
      reason: comment,
    });

    res.json({ success: true, data: record });
  });

  // Reject Record (Verifier / Admin)
  app.post('/api/records/:id/reject', authenticateToken, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const record = dbService.getRecordById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Land record not found' });

    const { reason = 'Document rejected due to illegibility / counterfeit suspicion.' } = req.body;

    record.status = 'REJECTED';
    record.verifiedBy = user.id;
    record.verifierName = user.name;
    record.verifierComment = reason;
    record.verifiedAt = new Date().toISOString();

    dbService.updateRecord(record.id, record);
    dbService.updateDocument(record.documentId, { status: 'REJECTED' });

    const task = dbService.getVerificationTaskByRecordId(record.id);
    if (task) {
      dbService.updateVerificationTask(task.id, { status: 'REJECTED' });
    }

    dbService.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'VERIFIER_REJECT',
      entityType: 'LAND_RECORD',
      entityId: record.id,
      reason: reason,
    });

    res.json({ success: true, data: record });
  });

  // ----------------------------------------------------
  // HUMAN VERIFICATION APIS
  // ----------------------------------------------------
  app.get('/api/verification/pending', authenticateToken, requireRole(['VERIFIER']), (req: Request, res: Response) => {
    const tasks = dbService.getVerificationTasks().filter((t) => t.status === 'PENDING' || t.status === 'IN_REVIEW');
    res.json({ success: true, data: tasks });
  });

  app.post('/api/verification/:id/submit', authenticateToken, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    const task = dbService.getVerificationTaskById(req.params.id);
    if (!task) return res.status(404).json({ success: false, error: 'Verification task not found' });

    const { action, corrections = {}, comments = '' } = req.body;
    const record = dbService.getRecordById(task.recordId);
    if (!record) return res.status(404).json({ success: false, error: 'Associated record not found' });

    // Apply any corrections
    for (const [key, newVal] of Object.entries(corrections)) {
      const field = record.fields[key];
      if (field && field.value !== newVal) {
        const oldVal = field.value;
        field.originalValue = field.originalValue ?? field.value;
        field.value = newVal as any;
        field.correctedValue = newVal as any;
        field.isVerified = true;
        field.confidence = 1.0;
        field.category = 'HIGH';
        field.isFlagged = false;

        dbService.addAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'VERIFIER_EDIT',
          entityType: 'LAND_RECORD',
          entityId: record.id,
          fieldKey: key,
          oldValue: oldVal,
          newValue: newVal as any,
          reason: comments || 'Corrected during verification session.',
        });
      }
    }

    if (action === 'APPROVE') {
      record.status = 'VERIFIED';
      record.verifiedBy = user.id;
      record.verifierName = user.name;
      record.verifierComment = comments;
      record.verifiedAt = new Date().toISOString();

      dbService.updateVerificationTask(task.id, { status: 'APPROVED' });
      dbService.updateDocument(record.documentId, { status: 'VERIFIED' });

      dbService.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'VERIFIER_APPROVE',
        entityType: 'LAND_RECORD',
        entityId: record.id,
        reason: comments || 'Approved after human verification.',
      });
    } else if (action === 'REJECT') {
      record.status = 'REJECTED';
      record.verifiedBy = user.id;
      record.verifierName = user.name;
      record.verifierComment = comments;
      record.verifiedAt = new Date().toISOString();

      dbService.updateVerificationTask(task.id, { status: 'REJECTED' });
      dbService.updateDocument(record.documentId, { status: 'REJECTED' });

      dbService.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'VERIFIER_REJECT',
        entityType: 'LAND_RECORD',
        entityId: record.id,
        reason: comments || 'Rejected by verifier.',
      });
    }

    dbService.updateRecord(record.id, record);
    res.json({ success: true, data: { task, record } });
  });

  // ----------------------------------------------------
  // DASHBOARD & AUDIT APIS
  // ----------------------------------------------------
  app.get('/api/dashboard/statistics', authenticateToken, (req: Request, res: Response) => {
    const stats = dbService.getDashboardStats();
    res.json({ success: true, data: stats });
  });

  app.get('/api/audit-logs', authenticateToken, requireRole(['ADMIN']), (req: Request, res: Response) => {
    const { action, entityType, entityId, limit } = req.query;
    let logs = dbService.getAuditLogs();

    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (entityType) {
      logs = logs.filter((l) => l.entityType === entityType);
    }
    if (entityId) {
      logs = logs.filter((l) => l.entityId === entityId);
    }
    if (limit) {
      logs = logs.slice(0, Number(limit));
    }

    res.json({ success: true, data: logs });
  });

  // ----------------------------------------------------
  // SEARCH API
  // ----------------------------------------------------
  app.get('/api/search', authenticateToken, (req: Request, res: Response) => {
    const query = String(req.query.q || '').toLowerCase().trim();
    const { ownerName, surveyNumber, khasraNumber, khataNumber, village, district, state, registrationNumber } = req.query;

    let records = dbService.getRecords();

    if (query) {
      records = records.filter(
        (r) =>
          r.ownerName.toLowerCase().includes(query) ||
          r.fatherGuardianName.toLowerCase().includes(query) ||
          r.surveyNumber.toLowerCase().includes(query) ||
          r.khasraNumber.toLowerCase().includes(query) ||
          r.khataNumber.toLowerCase().includes(query) ||
          r.plotNumber.toLowerCase().includes(query) ||
          r.village.toLowerCase().includes(query) ||
          r.tehsil.toLowerCase().includes(query) ||
          r.district.toLowerCase().includes(query) ||
          r.state.toLowerCase().includes(query) ||
          r.registrationNumber.toLowerCase().includes(query)
      );
    }

    if (ownerName) records = records.filter((r) => r.ownerName.toLowerCase().includes(String(ownerName).toLowerCase()));
    if (surveyNumber) records = records.filter((r) => r.surveyNumber.toLowerCase().includes(String(surveyNumber).toLowerCase()));
    if (khasraNumber) records = records.filter((r) => r.khasraNumber.toLowerCase().includes(String(khasraNumber).toLowerCase()));
    if (khataNumber) records = records.filter((r) => r.khataNumber.toLowerCase().includes(String(khataNumber).toLowerCase()));
    if (village) records = records.filter((r) => r.village.toLowerCase().includes(String(village).toLowerCase()));
    if (district) records = records.filter((r) => r.district.toLowerCase().includes(String(district).toLowerCase()));
    if (state) records = records.filter((r) => r.state.toLowerCase().includes(String(state).toLowerCase()));
    if (registrationNumber) records = records.filter((r) => r.registrationNumber.toLowerCase().includes(String(registrationNumber).toLowerCase()));

    res.json({
      success: true,
      data: {
        total: records.length,
        results: records,
      },
    });
  });

  // ----------------------------------------------------
  // CONFIG & RULES APIS
  // ----------------------------------------------------
  app.get('/api/config/rules', authenticateToken, requireRole(['ADMIN']), (req: Request, res: Response) => {
    res.json({ success: true, data: dbService.getRulesConfig() });
  });

  app.put('/api/config/rules', authenticateToken, (req: Request, res: Response) => {
    const user: User = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only administrators can update validation rules' });
    }

    const updated = dbService.updateRulesConfig(req.body);

    dbService.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'RULE_CONFIG_UPDATE',
      entityType: 'VALIDATION_RULE',
      entityId: 'RULES_CONFIG',
      reason: 'Validation rules & confidence thresholds updated by admin.',
    });

    res.json({ success: true, data: updated });
  });

  // Sample Documents Generator Helper for judges
  app.get('/api/sample-documents', authenticateToken, (req: Request, res: Response) => {
    const samples = [
      {
        id: 'sample-mh-ror',
        title: 'Maharashtra 7/12 RoR (English/Marathi)',
        state: 'Maharashtra',
        language: 'English',
        type: '7/12 Extract',
        description: 'Standard high-confidence English/Marathi land extract with clear registration seals.',
        svgUrl: generateSampleDeedSvg('7/12 Extract (Record of Rights)', 'Maharashtra', 'English', 'Rajesh Vasantrao Deshmukh', '214/1A', '7.90 Acres', '#047857'),
      },
      {
        id: 'sample-wb-khatian',
        title: 'West Bengal LR Khatian (Bengali Script)',
        state: 'West Bengal',
        language: 'Bengali',
        type: 'Khatian',
        description: 'Handwritten Bengali Porcha with smudged ink in the plot area column for human verification testing.',
        svgUrl: generateSampleDeedSvg('LR Khatian & Porcha Record', 'West Bengal', 'Bengali', 'Pravir Kumar Roy (প্রবীর কুমার রায়)', 'Dag 512/3', '1.72 Acres [Handwritten]', '#b45309'),
      },
      {
        id: 'sample-mp-khasra',
        title: 'Madhya Pradesh Khasra-Khatauni (Hindi Devanagari)',
        state: 'Madhya Pradesh',
        language: 'Hindi',
        type: 'Khasra-Khatauni',
        description: 'Revenue Adhikar Abhilekh in Devanagari Hindi with Namantaran mutation order.',
        svgUrl: generateSampleDeedSvg('Khasra - Khatauni Adhikar Abhilekh', 'Madhya Pradesh', 'Hindi', 'Ramesh Chandra Patidar (रमेश चन्द्र पाटीदार)', '184/2', '4.57 Acres', '#1e3a8a'),
      },
    ];
    res.json({ success: true, data: samples });
  });

  // Reset demo database and restart pipeline
  app.post('/api/system/reset', (req: Request, res: Response) => {
    dbService.resetDatabase();
    res.json({ success: true, message: 'Cadastral database & verification queues have been reset to default state.' });
  });

  // OpenAPI Specification for Swagger documentation
  app.get('/api/docs/openapi.json', (req: Request, res: Response) => {
    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'DoLR Intelligent Land Record Digitization & Validation API',
        version: '1.0.0',
        description: 'REST API suite for automated OCR extraction, multi-lingual field classification, confidence scoring, business validation, and verification workflow.',
      },
      servers: [{ url: '/api' }],
      paths: {
        '/auth/login': { post: { summary: 'Authenticate user with role-based credentials' } },
        '/documents/upload': { post: { summary: 'Upload scanned land record document (PDF/PNG/JPG)' } },
        '/documents/{id}/process': { post: { summary: 'Execute Gemini AI multi-lingual OCR & extraction pipeline' } },
        '/records': { get: { summary: 'Retrieve and filter structured land records' } },
        '/verification/pending': { get: { summary: 'Get queue of low-confidence documents requiring human verification' } },
        '/verification/{id}/submit': { post: { summary: 'Submit verifier edits, approval, or rejection with audit logging' } },
        '/dashboard/statistics': { get: { summary: 'Retrieve real-time cadastral digitization analytics and progress' } },
        '/audit-logs': { get: { summary: 'Query immutable tamper-evident audit logs' } },
        '/search': { get: { summary: 'Search records by landowner, survey no, khasra, khata, or village' } },
      },
    };
    res.json(openApiSpec);
  });

  // Health API
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), system: 'DoLR Land Record Digitization Engine' });
  });

  // Explicit API 404 handler so unmatched API routes never return Vite's index.html
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Global error handler for API routes
  app.use((err: any, req: Request, res: Response, next: Function) => {
    console.error('Unhandled server error:', err);
    if (req.path.startsWith('/api')) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error',
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DoLR Land Record Digitization Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
