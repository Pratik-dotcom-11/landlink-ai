"""
Confidence Scoring & Human-In-The-Loop (HITL) Verification Triage Engine.
Evaluates multi-factor confidence across character certainty, field completeness, and cadastral rule conformance.
"""
from typing import Dict, List, Tuple
import re
from schemas.models import (
    ExtractedField,
    ConfidenceTier,
    ValidationRuleAlert,
    AreaExtraction,
)
from config import PipelineConfig, default_config


class ConfidenceScorer:
    """
    Cadastral Confidence and Verification Assessor.
    """

    CRITICAL_FIELDS = ["owner_name", "khasra_number", "area", "district", "village", "state"]

    def __init__(self, config: PipelineConfig = default_config):
        self.config = config

    def evaluate_record(
        self,
        fields: Dict[str, ExtractedField],
        area_details: AreaExtraction,
        ocr_average_confidence: float
    ) -> Tuple[float, ConfidenceTier, bool, List[str], bool, List[ValidationRuleAlert]]:
        """
        Calculates overall record confidence score and determines human verification requirements.
        Returns:
            (overall_confidence, confidence_tier, requires_human_verification, verification_reasons, auto_approval_eligible, validation_alerts)
        """
        verification_reasons: List[str] = []
        validation_alerts: List[ValidationRuleAlert] = []

        field_weights = {
            "owner_name": 0.20,
            "khasra_number": 0.18,
            "area": 0.15,
            "khata_number": 0.10,
            "district": 0.08,
            "village": 0.07,
            "tehsil": 0.05,
            "state": 0.05,
            "father_guardian_name": 0.04,
            "land_classification": 0.03,
            "ownership_type": 0.02,
            "survey_number": 0.01,
            "plot_number": 0.01,
            "mutation_info": 0.005,
            "registration_info": 0.005,
        }

        weighted_sum = 0.0
        total_weight = 0.0

        for field_key, weight in field_weights.items():
            field_obj = fields.get(field_key)
            if field_obj and field_obj.value is not None:
                # Add weighted score
                weighted_sum += field_obj.confidence * weight
                total_weight += weight

                # Validate specific field integrity
                self._validate_field_integrity(field_obj, validation_alerts, verification_reasons)
            else:
                if field_key in self.CRITICAL_FIELDS:
                    # Full weight penalty for critical missing fields
                    total_weight += weight
                    verification_reasons.append(f"Critical field '{field_key}' is missing or undetectable in document.")
                    validation_alerts.append(ValidationRuleAlert(
                        rule_code="VAL-CRITICAL-MISSING",
                        rule_name="Critical Field Presence",
                        status="FAIL",
                        severity="HIGH",
                        message=f"Mandatory field '{field_key}' is absent.",
                        is_blocking=True
                    ))
                else:
                    # Partial weight (optional fields) so absence doesn't unfairly penalize clean records
                    total_weight += weight * 0.25

        # Overall confidence blends weighted field extraction certainty with raw OCR clarity
        base_record_confidence = weighted_sum / max(0.001, total_weight)
        overall_confidence = round((base_record_confidence * 0.75) + (ocr_average_confidence * 0.25), 4)

        # Classify overall confidence tier
        if overall_confidence >= self.config.HIGH_CONFIDENCE_THRESHOLD:
            conf_tier = ConfidenceTier.HIGH
        elif overall_confidence >= self.config.MEDIUM_CONFIDENCE_THRESHOLD:
            conf_tier = ConfidenceTier.MEDIUM
        else:
            conf_tier = ConfidenceTier.LOW

        # Validate Area Value Plausibility
        if area_details.value is not None and area_details.value <= 0:
            verification_reasons.append("Extracted land area is zero or negative.")
            validation_alerts.append(ValidationRuleAlert(
                rule_code="VAL-AREA-RANGE",
                rule_name="Land Area Non-Zero Check",
                status="FAIL",
                severity="CRITICAL",
                message="Extracted area must be strictly positive.",
                is_blocking=True
            ))

        # Human verification requirement decision
        requires_verification = (
            overall_confidence < self.config.AUTO_APPROVE_MIN_CONFIDENCE
            or len(verification_reasons) > 0
            or any(a.is_blocking for a in validation_alerts)
            or any(fields.get(k) is None or fields.get(k).value is None for k in ["owner_name", "khasra_number"])
        )

        auto_approval_eligible = (
            not requires_verification
            and overall_confidence >= self.config.AUTO_APPROVE_MIN_CONFIDENCE
            and len(validation_alerts) == 0
        )

        return (
            overall_confidence,
            conf_tier,
            requires_verification,
            verification_reasons,
            auto_approval_eligible,
            validation_alerts
        )

    def _validate_field_integrity(
        self,
        field_obj: ExtractedField,
        alerts: List[ValidationRuleAlert],
        reasons: List[str]
    ) -> None:
        """
        Runs syntactic and domain checks on individual extracted fields.
        """
        k = field_obj.field_key
        val_str = str(field_obj.value)

        # 1. Khasra / Survey Number Format Check
        if k in ("khasra_number", "survey_number", "plot_number"):
            if not re.search(r"^\d+(?:[/\-][\dA-Za-z]+)?$", val_str):
                alerts.append(ValidationRuleAlert(
                    rule_code="VAL-KHASRA-FMT",
                    rule_name="Cadastral Plot Format Validation",
                    status="WARNING",
                    severity="MEDIUM",
                    message=f"Field '{k}' with value '{val_str}' deviates from standard survey syntax (e.g. 184/2).",
                    is_blocking=False
                ))

        # 2. Owner Name Sanity Check
        if k == "owner_name":
            if len(val_str.strip()) < 3 or re.search(r"^\d+$", val_str):
                reasons.append("Owner name appears corrupted or contains only numerals.")
                alerts.append(ValidationRuleAlert(
                    rule_code="VAL-NAME-SYNTAX",
                    rule_name="Landholder Name Syntax",
                    status="FAIL",
                    severity="HIGH",
                    message="Owner name does not contain a valid personal name string.",
                    is_blocking=True
                ))

        # 3. Confidence Threshold Check
        if field_obj.confidence < self.config.HIGH_CONFIDENCE_THRESHOLD:
            field_obj.verification_required = True
            if field_obj.confidence < self.config.MEDIUM_CONFIDENCE_THRESHOLD:
                reasons.append(f"Low OCR confidence ({field_obj.confidence:.2f}) on '{field_obj.field_label}'.")
