"""
Surgery recommendations and database.
Provides AI-based surgery recommendations based on patient conditions,
along with risk profiles and side-effects for each surgery.
"""

# Comprehensive surgery database with risk factors and side-effects
SURGERY_DATABASE = {
    "Cataract Surgery": {
        "description": "Removal of clouded lens",
        "risk_categories": ["age > 70", "diabetes", "high_cholesterol"],
        "base_risk_increase": 0.1,
        "common_side_effects": [
            "Temporary blurred vision",
            "Mild inflammation",
            "Dry eyes (1-3 months)",
            "Posterior capsule opacification (rare)"
        ],
        "serious_complications": [
            "Retinal detachment (rare)",
            "Corneal edema (rare)",
            "Infection (very rare)"
        ],
        "recovery_time": "2-4 weeks",
        "indications": ["cataracts", "vision_problems"],
        "contraindications": ["severe_infection", "severe_retinopathy"]
    },
    "Knee Replacement": {
        "description": "Total or partial knee joint replacement",
        "risk_categories": ["age > 65", "obesity", "diabetes", "hypertension"],
        "base_risk_increase": 0.15,
        "common_side_effects": [
            "Pain and swelling (2-3 months)",
            "Stiffness in movement",
            "Scar tissue formation",
            "Mild leg swelling"
        ],
        "serious_complications": [
            "Deep vein thrombosis (DVT)",
            "Infection",
            "Implant loosening (rare)",
            "Persistent pain (rare)"
        ],
        "recovery_time": "3-6 months",
        "indications": ["osteoarthritis", "joint_damage", "severe_arthritis"],
        "contraindications": ["active_infection", "severe_heart_disease"]
    },
    "Hip Replacement": {
        "description": "Total or partial hip joint replacement",
        "risk_categories": ["age > 60", "obesity", "previous_surgeries"],
        "base_risk_increase": 0.12,
        "common_side_effects": [
            "Hip pain (gradually improving)",
            "Swelling (3-6 months)",
            "Limp or limited mobility initially",
            "Numbness in upper thigh"
        ],
        "serious_complications": [
            "Dislocation",
            "Deep vein thrombosis (DVT)",
            "Nerve damage (rare)",
            "Infection"
        ],
        "recovery_time": "4-6 months",
        "indications": ["osteoarthritis", "hip_fracture", "avascular_necrosis"],
        "contraindications": ["severe_infection", "advanced_dementia"]
    },
    "Coronary Artery Bypass": {
        "description": "Bypass surgery for blocked heart arteries",
        "risk_categories": ["age > 70", "diabetes", "hypertension", "smoking"],
        "base_risk_increase": 0.25,
        "common_side_effects": [
            "Chest pain (controlled with medication)",
            "Memory problems (temporary)",
            "Fatigue for 2-3 months",
            "Mood changes"
        ],
        "serious_complications": [
            "Stroke",
            "Heart attack",
            "Kidney failure",
            "Atrial fibrillation (irregular heartbeat)",
            "Infection"
        ],
        "recovery_time": "3-6 months",
        "indications": ["coronary_artery_disease", "blocked_arteries"],
        "contraindications": ["severe_kidney_disease", "advanced_cancer"]
    },
    "Hernia Repair": {
        "description": "Surgical repair of abdominal or inguinal hernia",
        "risk_categories": ["obesity", "previous_surgeries"],
        "base_risk_increase": 0.08,
        "common_side_effects": [
            "Pain at incision site (1-2 weeks)",
            "Mild bruising and swelling",
            "Temporary numbness",
            "Constipation (temporary)"
        ],
        "serious_complications": [
            "Infection",
            "Recurrence",
            "Nerve damage (rare)",
            "Blood vessel injury (rare)"
        ],
        "recovery_time": "1-2 weeks",
        "indications": ["hernia", "abdominal_bulge"],
        "contraindications": ["active_skin_infection", "uncontrolled_bleeding"]
    },
    "Appendectomy": {
        "description": "Removal of the appendix",
        "risk_categories": ["previous_surgeries"],
        "base_risk_increase": 0.06,
        "common_side_effects": [
            "Pain at incision (1-2 weeks)",
            "Mild fever (rare)",
            "Temporary constipation",
            "Nausea (temporary)"
        ],
        "serious_complications": [
            "Infection",
            "Bleeding",
            "Bowel obstruction (rare)",
            "Adhesions (rare)"
        ],
        "recovery_time": "1-3 weeks",
        "indications": ["appendicitis"],
        "contraindications": ["severe_infection", "peritonitis"]
    },
    "Prostate Surgery (TURP)": {
        "description": "Transurethral resection of prostate",
        "risk_categories": ["age > 70", "diabetes"],
        "base_risk_increase": 0.09,
        "common_side_effects": [
            "Difficulty urinating temporarily",
            "Urinary incontinence (temporary, 3-6 months)",
            "Mild blood in urine",
            "Erectile dysfunction (possible)"
        ],
        "serious_complications": [
            "Infection (UTI)",
            "Bleeding",
            "TURP syndrome (fluid overload)",
            "Urethral stricture (rare)"
        ],
        "recovery_time": "2-6 weeks",
        "indications": ["benign_prostate_hyperplasia", "urinary_retention"],
        "contraindications": ["active_UTI", "severe_bleeding_disorder"]
    },
    "Thyroid Surgery": {
        "description": "Thyroid gland removal or partial removal",
        "risk_categories": ["age > 50"],
        "base_risk_increase": 0.07,
        "common_side_effects": [
            "Sore throat (3-5 days)",
            "Neck stiffness",
            "Mild hoarseness (temporary)",
            "Swallowing difficulty (temporary)"
        ],
        "serious_complications": [
            "Hypocalcemia (low calcium)",
            "Permanent hoarseness (rare)",
            "Thyroid storm (rare)",
            "Bleeding"
        ],
        "recovery_time": "2-3 weeks",
        "indications": ["thyroid_cancer", "severe_hyperthyroidism", "large_goiter"],
        "contraindications": ["severe_heart_disease", "uncontrolled_hyperthyroidism"]
    },
    "Joint Arthroscopy": {
        "description": "Minimally invasive joint inspection and repair",
        "risk_categories": ["obesity"],
        "base_risk_increase": 0.05,
        "common_side_effects": [
            "Joint swelling (1-2 weeks)",
            "Mild pain",
            "Stiffness (temporary)",
            "Small visible scars"
        ],
        "serious_complications": [
            "Infection",
            "Bleeding into joint",
            "Blood clots (rare)",
            "Nerve damage (rare)"
        ],
        "recovery_time": "1-2 weeks",
        "indications": ["torn_meniscus", "torn_cartilage", "joint_inflammation"],
        "contraindications": ["active_infection", "severe_joint_damage"]
    },
    "Gallbladder Removal (Cholecystectomy)": {
        "description": "Surgical removal of the gallbladder",
        "risk_categories": ["obesity", "age > 65", "diabetes"],
        "base_risk_increase": 0.08,
        "common_side_effects": [
            "Abdominal bloating (weeks)",
            "Diarrhea (temporary, common)",
            "Gas and indigestion",
            "Mild abdominal discomfort"
        ],
        "serious_complications": [
            "Bile duct injury (rare)",
            "Infection",
            "Pancreatitis (rare)",
            "Bleeding"
        ],
        "recovery_time": "2-4 weeks",
        "indications": ["gallstones", "biliary_colic", "cholecystitis"],
        "contraindications": ["acute_pancreatitis", "severe_infection"]
    },
    "Cataract Surgery with IOL": {
        "description": "Cataract removal with intraocular lens implant",
        "risk_categories": ["age > 65", "diabetes"],
        "base_risk_increase": 0.11,
        "common_side_effects": [
            "Temporary vision fluctuation",
            "Mild inflammation (1-2 weeks)",
            "Scratchy feeling",
            "Light sensitivity (temporary)"
        ],
        "serious_complications": [
            "Posterior capsule opacification",
            "Astigmatism",
            "IOL malposition (rare)",
            "Retinal detachment (very rare)"
        ],
        "recovery_time": "2-4 weeks",
        "indications": ["cataracts", "vision_impairment"],
        "contraindications": ["severe_retinopathy", "active_infection"]
    }
}

# Mapping of patient conditions to recommended surgeries
CONDITION_SURGERY_MAPPING = {
    "Type 2 Diabetes": [
        ("Cataract Surgery", 0.8, "Diabetic retinopathy/cataracts common"),
        ("Kidney transplant", 0.5, "If severe kidney disease"),
    ],
    "Hypertension": [
        ("Coronary Artery Bypass", 0.7, "If comorbid with heart disease"),
    ],
    "COPD": [
        ("Lung surgery", 0.6, "Risk assessment needed"),
    ],
    "Coronary Artery Disease": [
        ("Coronary Artery Bypass", 0.9, "Primary treatment option"),
    ],
    "Osteoarthritis": [
        ("Knee Replacement", 0.85, "If knee OA"),
        ("Hip Replacement", 0.85, "If hip OA"),
        ("Joint Arthroscopy", 0.6, "For diagnosis/minor repairs"),
    ],
    "Benign Prostate Hyperplasia": [
        ("Prostate Surgery (TURP)", 0.8, "Indicated for BPH symptoms"),
    ],
    "Thyroid Cancer": [
        ("Thyroid Surgery", 0.95, "Definitive treatment"),
    ],
    "Gallstones": [
        ("Gallbladder Removal (Cholecystectomy)", 0.9, "If symptomatic"),
    ],
    "Migraine": [
        ("Joint Arthroscopy", 0.3, "Not typically surgical"),
    ],
    "Anxiety": [
        ("Joint Arthroscopy", 0.1, "Not typically surgical"),
    ],
    "Hip Fracture": [
        ("Hip Replacement", 0.95, "Standard treatment"),
    ],
    "Severe Arthritis": [
        ("Knee Replacement", 0.85, "Primary treatment"),
        ("Hip Replacement", 0.85, "Primary treatment"),
    ],
}


def recommend_surgeries_for_patient(patient_conditions, temperature=0.7):
    """
    AI-based surgery recommendation based on patient conditions.
    Returns list of recommended surgeries with confidence scores.
    
    Args:
        patient_conditions: List of patient's medical conditions
        temperature: Confidence threshold (0-1)
    
    Returns:
        List of tuples: (surgery_name, confidence_score, reason)
    """
    recommendations = []
    seen_surgeries = set()
    
    for condition in patient_conditions:
        if condition in CONDITION_SURGERY_MAPPING:
            for surgery_name, confidence, reason in CONDITION_SURGERY_MAPPING[condition]:
                if confidence >= temperature and surgery_name not in seen_surgeries:
                    recommendations.append({
                        "name": surgery_name,
                        "confidence": confidence,
                        "reason": reason,
                        "condition": condition
                    })
                    seen_surgeries.add(surgery_name)
    
    # Sort by confidence score (highest first)
    recommendations.sort(key=lambda x: x["confidence"], reverse=True)
    
    return recommendations


def get_surgery_details(surgery_name):
    """
    Get detailed information about a specific surgery.
    
    Args:
        surgery_name: Name of the surgery
    
    Returns:
        Dictionary with surgery details or None if not found
    """
    return SURGERY_DATABASE.get(surgery_name, None)


def calculate_surgery_risk_increase(patient_data, surgery_name):
    """
    Calculate additional risk increase for a specific surgery based on patient profile.
    
    Args:
        patient_data: Patient's health parameters
        surgery_name: Name of the surgery
    
    Returns:
        Additional risk percentage (0-0.5)
    """
    if surgery_name not in SURGERY_DATABASE:
        return 0.0
    
    surgery_info = SURGERY_DATABASE[surgery_name]
    additional_risk = surgery_info["base_risk_increase"]
    
    # Adjust based on patient profile
    risk_categories = surgery_info.get("risk_categories", [])
    
    for category in risk_categories:
        if "age >" in category:
            threshold = int(category.split(">")[1].strip())
            if patient_data.get("age", 0) > threshold:
                additional_risk += 0.05
        elif "diabetes" in category.lower():
            if patient_data.get("diabetes", False):
                additional_risk += 0.05
        elif "hypertension" in category.lower():
            bp = patient_data.get("systolic_bp", 120)
            if bp > 140:
                additional_risk += 0.05
        elif "obesity" in category.lower() or "bmi" in category.lower():
            if patient_data.get("bmi", 25) > 30:
                additional_risk += 0.05
        elif "smoking" in category.lower():
            if patient_data.get("smoking", False):
                additional_risk += 0.04
        elif "previous_surgeries" in category.lower():
            if patient_data.get("previous_surgeries", 0) > 1:
                additional_risk += 0.04
    
    return min(additional_risk, 0.5)  # Cap at 0.5 additional risk
