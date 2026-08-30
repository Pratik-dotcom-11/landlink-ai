import { ExtractedField, LandRecord, ValidationRuleResult, ValidationRulesConfig } from '../src/types.js';

export const DEFAULT_RULES_CONFIG: ValidationRulesConfig = {
  highConfidenceThreshold: 0.85,
  mediumConfidenceThreshold: 0.60,
  enableRequiredFieldsCheck: true,
  enableSurveyFormatCheck: true,
  enableKhataFormatCheck: true,
  enableAreaPositiveCheck: true,
  enableDuplicateRecordCheck: true,
  enableGeoHierarchyCheck: true,
  enableOwnerConsistencyCheck: true,
  enableMutationDateCheck: true,
  requiredFields: [
    'owner_name',
    'survey_number',
    'khata_number',
    'plot_area',
    'village',
    'district',
    'state',
  ],
  maxAreaAcresLimit: 500, // Maximum reasonable single parcel size in acres
};

// Known reference states & districts for demo geo consistency verification
const REFERENCE_GEO: Record<string, string[]> = {
  'Madhya Pradesh': ['Khargone', 'Indore', 'Bhopal', 'Ujjain', 'Dhar', 'Jabalpur', 'Gwalior'],
  'Maharashtra': ['Pune', 'Nashik', 'Nagpur', 'Thane', 'Satara', 'Kolhapur', 'Ahmednagar'],
  'West Bengal': ['Nadia', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Bardhaman', 'Murshidabad', 'Kolkata'],
  'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Prayagraj', 'Kanpur', 'Agra', 'Meerut', 'Gorakhpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar'],
  'Karnataka': ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Dharwad', 'Mangaluru'],
};

export function evaluateConfidenceCategory(
  score: number,
  config: ValidationRulesConfig = DEFAULT_RULES_CONFIG
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= config.highConfidenceThreshold) return 'HIGH';
  if (score >= config.mediumConfidenceThreshold) return 'MEDIUM';
  return 'LOW';
}

export function runValidationEngine(
  fields: Record<string, ExtractedField>,
  existingRecords: LandRecord[] = [],
  currentRecordId?: string,
  config: ValidationRulesConfig = DEFAULT_RULES_CONFIG
): {
  results: ValidationRuleResult[];
  overallConfidence: number;
  hasFailures: boolean;
  hasWarnings: boolean;
  lowConfidenceFields: string[];
  suggestedStatus: 'AUTO_APPROVED' | 'PENDING_VERIFICATION' | 'VALIDATION_FAILED';
} {
  const results: ValidationRuleResult[] = [];
  const lowConfidenceFields: string[] = [];

  // Calculate weighted average confidence
  let totalConfidence = 0;
  let fieldCount = 0;

  for (const [key, field] of Object.entries(fields)) {
    totalConfidence += field.confidence;
    fieldCount++;

    const category = evaluateConfidenceCategory(field.confidence, config);
    field.category = category;

    if (category === 'LOW') {
      lowConfidenceFields.push(key);
      field.isFlagged = true;
    }
  }

  const overallConfidence = fieldCount > 0 ? Number((totalConfidence / fieldCount).toFixed(2)) : 0;

  // 1. Required Fields Check
  if (config.enableRequiredFieldsCheck) {
    for (const requiredKey of config.requiredFields) {
      const field = fields[requiredKey];
      if (!field || field.value === null || field.value === undefined || String(field.value).trim() === '') {
        results.push({
          rule: 'Mandatory Land Record Field Missing',
          ruleCode: 'REQ_01',
          status: 'FAIL',
          severity: 'HIGH',
          message: `Mandatory field '${field ? field.label : requiredKey}' is missing or could not be detected.`,
          fieldKey: requiredKey,
        });
      } else {
        results.push({
          rule: 'Mandatory Fields Validation',
          ruleCode: 'REQ_01',
          status: 'PASS',
          severity: 'LOW',
          message: `Field '${field.label}' is present.`,
          fieldKey: requiredKey,
        });
      }
    }
  }

  // 2. Survey / Khasra Number Format Check
  if (config.enableSurveyFormatCheck) {
    const surveyField = fields['survey_number'] || fields['khasra_number'];
    if (surveyField && surveyField.value) {
      const surveyStr = String(surveyField.value).trim();
      // Accepts formats like: "102", "102/4", "Gat 214/1A", "Dag 512/3", "184-B"
      const isValidFormat = /^[A-Za-z0-9\s\/\-\.]{1,25}$/.test(surveyStr) && /\d/.test(surveyStr);
      if (isValidFormat) {
        results.push({
          rule: 'Survey / Khasra Identifier Format Check',
          ruleCode: 'SRV_FMT_01',
          status: 'PASS',
          severity: 'LOW',
          message: `Survey/Khasra number '${surveyStr}' conforms to cadastral numbering conventions.`,
          fieldKey: 'survey_number',
        });
      } else {
        results.push({
          rule: 'Survey / Khasra Identifier Format Check',
          ruleCode: 'SRV_FMT_01',
          status: 'WARNING',
          severity: 'MEDIUM',
          message: `Survey/Khasra number '${surveyStr}' contains non-standard characters. Verify against deed.`,
          fieldKey: 'survey_number',
        });
      }
    }
  }

  // 3. Khata Number Format Check
  if (config.enableKhataFormatCheck) {
    const khataField = fields['khata_number'];
    if (khataField && khataField.value) {
      const khataStr = String(khataField.value).trim();
      const isValidKhata = /^[A-Za-z0-9\s\/\-\.]{1,25}$/.test(khataStr);
      if (isValidKhata) {
        results.push({
          rule: 'Khata / Record of Rights Index Check',
          ruleCode: 'KHT_FMT_01',
          status: 'PASS',
          severity: 'LOW',
          message: `Khata index '${khataStr}' conforms to revenue record format.`,
          fieldKey: 'khata_number',
        });
      } else {
        results.push({
          rule: 'Khata / Record of Rights Index Check',
          ruleCode: 'KHT_FMT_01',
          status: 'WARNING',
          severity: 'LOW',
          message: `Khata number format warning: '${khataStr}'.`,
          fieldKey: 'khata_number',
        });
      }
    }
  }

  // 4. Area Positivity & Reasonable Bounds Check
  if (config.enableAreaPositiveCheck) {
    const areaField = fields['plot_area'];
    if (areaField && areaField.value !== null && areaField.value !== undefined) {
      const numericArea = Number(areaField.value);
      if (isNaN(numericArea) || numericArea <= 0) {
        results.push({
          rule: 'Plot Area Positivity & Validity Check',
          ruleCode: 'AREA_01',
          status: 'FAIL',
          severity: 'HIGH',
          message: `Extracted plot area '${areaField.value}' is non-positive or invalid.`,
          fieldKey: 'plot_area',
        });
      } else if (numericArea > config.maxAreaAcresLimit) {
        results.push({
          rule: 'Plot Area Outlier Upper Bound Warning',
          ruleCode: 'AREA_02',
          status: 'WARNING',
          severity: 'MEDIUM',
          message: `Plot area of ${numericArea} acres exceeds standard single-parcel threshold (${config.maxAreaAcresLimit} acres). Requires verifier cross-check.`,
          fieldKey: 'plot_area',
        });
      } else {
        results.push({
          rule: 'Plot Area Positivity & Validity Check',
          ruleCode: 'AREA_01',
          status: 'PASS',
          severity: 'LOW',
          message: `Plot area of ${numericArea} ${fields['plot_area_unit']?.value || 'Acres'} is valid.`,
          fieldKey: 'plot_area',
        });
      }
    }
  }

  // 5. Duplicate Record Detection (Survey + Village + District)
  if (config.enableDuplicateRecordCheck) {
    const srv = String(fields['survey_number']?.value || '').toLowerCase().trim();
    const vil = String(fields['village']?.value || '').toLowerCase().trim();
    const dis = String(fields['district']?.value || '').toLowerCase().trim();

    if (srv && vil && dis) {
      const duplicate = existingRecords.find(
        (r) =>
          r.id !== currentRecordId &&
          r.status !== 'REJECTED' &&
          r.surveyNumber.toLowerCase().trim() === srv &&
          r.village.toLowerCase().trim() === vil &&
          r.district.toLowerCase().trim() === dis
      );

      if (duplicate) {
        results.push({
          rule: 'Duplicate Cadastral Parcel Detection',
          ruleCode: 'DUP_01',
          status: 'WARNING',
          severity: 'HIGH',
          message: `Potential duplicate record detected with identical Survey No '${srv}' in Village '${vil}', District '${dis}' (Existing Record ID: ${duplicate.id}).`,
          fieldKey: 'survey_number',
        });
      } else {
        results.push({
          rule: 'Duplicate Cadastral Parcel Detection',
          ruleCode: 'DUP_01',
          status: 'PASS',
          severity: 'LOW',
          message: 'No active duplicate survey parcel found in regional revenue repository.',
        });
      }
    }
  }

  // 6. Geographic Administrative Hierarchy Consistency
  if (config.enableGeoHierarchyCheck) {
    const stateVal = String(fields['state']?.value || '').trim();
    const distVal = String(fields['district']?.value || '').trim();

    if (stateVal && distVal) {
      const matchedState = Object.keys(REFERENCE_GEO).find(
        (s) => s.toLowerCase() === stateVal.toLowerCase()
      );

      if (matchedState) {
        const districts = REFERENCE_GEO[matchedState];
        const matchedDist = districts.find(
          (d) => d.toLowerCase() === distVal.toLowerCase()
        );

        if (matchedDist) {
          results.push({
            rule: 'Administrative Hierarchy Verification (State ↔ District)',
            ruleCode: 'GEO_01',
            status: 'PASS',
            severity: 'LOW',
            message: `District '${distVal}' is recognized within State '${stateVal}'. [DEMO Reference Gazetteer]`,
            fieldKey: 'district',
          });
        } else {
          results.push({
            rule: 'Administrative Hierarchy Verification (State ↔ District)',
            ruleCode: 'GEO_01',
            status: 'WARNING',
            severity: 'LOW',
            message: `District '${distVal}' could not be automatically confirmed in standard list for '${stateVal}'. Verifier review advised.`,
            fieldKey: 'district',
          });
        }
      }
    }
  }

  // 7. Owner Name Consistency & Semantics
  if (config.enableOwnerConsistencyCheck) {
    const ownerField = fields['owner_name'];
    if (ownerField && ownerField.value) {
      const ownerStr = String(ownerField.value).trim();
      if (ownerStr.length < 3 || /[\$\#\<\>\{\}\[\]\\\|\*\^\%\@]/.test(ownerStr)) {
        results.push({
          rule: 'Landowner Identity Character Consistency',
          ruleCode: 'OWNER_01',
          status: 'FAIL',
          severity: 'HIGH',
          message: `Landowner name '${ownerStr}' contains invalid special characters or is too short.`,
          fieldKey: 'owner_name',
        });
      } else {
        results.push({
          rule: 'Landowner Identity Character Consistency',
          ruleCode: 'OWNER_01',
          status: 'PASS',
          severity: 'LOW',
          message: `Landowner name '${ownerStr}' passed structural sanitization.`,
          fieldKey: 'owner_name',
        });
      }
    }
  }

  // 8. Document Date & Temporal Validity
  if (config.enableMutationDateCheck) {
    const dateField = fields['document_date'];
    if (dateField && dateField.value) {
      const dateStr = String(dateField.value).trim();
      const parsedDate = new Date(dateStr);
      const now = new Date();
      if (!isNaN(parsedDate.getTime()) && parsedDate > now) {
        results.push({
          rule: 'Temporal Validity (Future Date Prevention)',
          ruleCode: 'DATE_01',
          status: 'FAIL',
          severity: 'HIGH',
          message: `Document date '${dateStr}' is in the future. Check deed stamp.`,
          fieldKey: 'document_date',
        });
      } else {
        results.push({
          rule: 'Temporal Validity Check',
          ruleCode: 'DATE_01',
          status: 'PASS',
          severity: 'LOW',
          message: `Document date is chronologically valid.`,
          fieldKey: 'document_date',
        });
      }
    }
  }

  // Determine overall status
  const hasFailures = results.some((r) => r.status === 'FAIL');
  const hasHighWarnings = results.some((r) => r.status === 'WARNING' && r.severity === 'HIGH');
  const hasLowConfidence = lowConfidenceFields.length > 0;

  let suggestedStatus: 'AUTO_APPROVED' | 'PENDING_VERIFICATION' | 'VALIDATION_FAILED';

  if (hasFailures) {
    suggestedStatus = 'VALIDATION_FAILED';
  } else if (hasLowConfidence || hasHighWarnings || overallConfidence < config.highConfidenceThreshold) {
    suggestedStatus = 'PENDING_VERIFICATION';
  } else {
    suggestedStatus = 'AUTO_APPROVED';
  }

  return {
    results,
    overallConfidence,
    hasFailures,
    hasWarnings: results.some((r) => r.status === 'WARNING'),
    lowConfidenceFields,
    suggestedStatus,
  };
}
