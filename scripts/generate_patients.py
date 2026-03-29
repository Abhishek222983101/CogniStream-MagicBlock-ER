#!/usr/bin/env python3
"""
TrialMatch AI - Generate Synthetic Indian Patient Records
Uses Groq API (llama-3.1-70b-versatile) to generate realistic patient profiles
Output: data/patients.json
"""

import os
import json
import time
import requests
from typing import Any

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "..", "data", "patients.json")
ENV_FILE = os.path.join(SCRIPT_DIR, "..", ".env")

INDIAN_NAMES_MALE = [
    "Arjun Patel",
    "Rajesh Kumar",
    "Vikram Singh",
    "Amit Sharma",
    "Rahul Gupta",
    "Suresh Reddy",
    "Anil Joshi",
    "Deepak Verma",
    "Ravi Menon",
    "Sanjay Iyer",
    "Prakash Nair",
    "Vijay Rao",
    "Kiran Shah",
    "Nitin Mehta",
    "Arun Kapoor",
]

INDIAN_NAMES_FEMALE = [
    "Priya Sharma",
    "Kavitha Nair",
    "Ananya Patel",
    "Deepika Rao",
    "Meera Iyer",
    "Sunita Gupta",
    "Pooja Reddy",
    "Lakshmi Menon",
    "Aarti Joshi",
    "Divya Verma",
    "Nisha Kapoor",
    "Ritu Singh",
    "Kavita Shah",
    "Pallavi Mehta",
    "Sarla Kumar",
]

INDIAN_CITIES = {
    "Mumbai": {"lat": 19.0760, "lng": 72.8777, "state": "Maharashtra"},
    "Delhi": {"lat": 28.6139, "lng": 77.2090, "state": "Delhi"},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946, "state": "Karnataka"},
    "Chennai": {"lat": 13.0827, "lng": 80.2707, "state": "Tamil Nadu"},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867, "state": "Telangana"},
    "Pune": {"lat": 18.5204, "lng": 73.8567, "state": "Maharashtra"},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639, "state": "West Bengal"},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714, "state": "Gujarat"},
}

CONDITIONS = [
    {"name": "Non-Small Cell Lung Cancer", "icd10": "C34", "subtype": "Adenocarcinoma"},
    {"name": "Breast Cancer", "icd10": "C50", "subtype": "Invasive Ductal Carcinoma"},
    {"name": "Colorectal Cancer", "icd10": "C18", "subtype": "Adenocarcinoma"},
    {"name": "Type 2 Diabetes Mellitus", "icd10": "E11", "subtype": "Uncontrolled"},
    {"name": "Hepatitis B", "icd10": "B16", "subtype": "Chronic"},
    {"name": "Pulmonary Tuberculosis", "icd10": "A15", "subtype": "Drug-Sensitive"},
    {"name": "Ischemic Heart Disease", "icd10": "I25", "subtype": "Stable Angina"},
    {"name": "Stroke", "icd10": "I63", "subtype": "Ischemic"},
]

GROQ_API_KEY = None
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def load_env():
    global GROQ_API_KEY
    with open(ENV_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("GROQ_API_KEY="):
                GROQ_API_KEY = line.split("=", 1)[1].strip()
                break
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in .env")


def generate_patient(index: int) -> dict[str, Any]:
    import random

    gender = random.choice(["Male", "Female"])
    if gender == "Male":
        name = random.choice(INDIAN_NAMES_MALE)
    else:
        name = random.choice(INDIAN_NAMES_FEMALE)

    city = random.choice(list(INDIAN_CITIES.keys()))
    city_info = INDIAN_CITIES[city]

    age = random.randint(25, 78)

    condition = random.choice(CONDITIONS)

    patient_id = f"ANON_{city_info['state'][:2].upper()}_{index:04d}"

    stage = None
    if "Cancer" in condition["name"]:
        stages = ["I", "II", "IIIA", "IIIB", "IV"]
        stage = random.choice(stages)

    biomarkers = {}
    if "Lung" in condition["name"]:
        egfr_status = random.choice(
            ["Exon 19 Deletion", "L858R Mutation", "Wild Type", "T790M Positive"]
        )
        biomarkers = {
            "EGFR": egfr_status,
            "ALK": random.choice(["Positive", "Negative"]),
            "PD_L1_TPS": random.randint(0, 100),
        }
    elif "Breast" in condition["name"]:
        biomarkers = {
            "ER": random.choice(["Positive", "Negative"]),
            "PR": random.choice(["Positive", "Negative"]),
            "HER2": random.choice(["Positive", "Negative", "Equivocal"]),
        }

    ecog = random.randint(0, 3)

    comorbidities = random.sample(
        [
            "Hypertension",
            "Type 2 Diabetes Mellitus",
            "Hyperlipidemia",
            "Hypothyroidism",
            "Chronic Kidney Disease",
        ],
        k=random.randint(0, 2),
    )

    medications = []
    if "Hypertension" in comorbidities:
        medications.append("Amlodipine 5mg OD")
    if (
        "Type 2 Diabetes Mellitus" in comorbidities
        or condition["name"] == "Type 2 Diabetes Mellitus"
    ):
        medications.append("Metformin 500mg BD")

    lab_values = {
        "hemoglobin": round(random.uniform(9.5, 15.5), 1),
        "wbc": random.randint(4000, 12000),
        "platelets": random.randint(100000, 400000),
        "creatinine": round(random.uniform(0.6, 1.8), 2),
        "bilirubin": round(random.uniform(0.3, 2.0), 2),
        "alt": random.randint(15, 100),
        "ast": random.randint(15, 100),
    }

    prior_treatments = []
    if stage and stage in ["IIIA", "IIIB", "IV"]:
        if random.random() > 0.5:
            prior_treatments.append(
                {
                    "type": "Surgery",
                    "name": "Tumor resection"
                    if "Lung" in condition["name"]
                    else "Lumpectomy",
                    "date": "2024-" + f"{random.randint(1, 12):02d}",
                    "hospital": random.choice(
                        [
                            "Tata Memorial Hospital",
                            "AIIMS Delhi",
                            "Apollo Hospitals",
                            "Fortis Healthcare",
                        ]
                    ),
                }
            )

    return {
        "patient_id": patient_id,
        "demographics": {
            "age": age,
            "gender": gender,
            "name": name,
            "city": city,
            "state": city_info["state"],
            "lat": city_info["lat"],
            "lng": city_info["lng"],
        },
        "diagnosis": {
            "primary": condition["name"],
            "subtype": condition["subtype"],
            "stage": stage,
            "icd10": condition["icd10"],
            "biomarkers": biomarkers if biomarkers else None,
        },
        "medical_history": comorbidities,
        "medications": medications,
        "prior_treatments": prior_treatments,
        "lab_values": lab_values,
        "ecog_status": ecog,
        "smoking_status": random.choice(["Never", "Former", "Current"]),
        "allergies": random.choice([[], ["Sulfonamides"], ["Penicillin"], ["NSAIDs"]]),
    }


def enhance_with_llm(patient: dict) -> dict:
    prompt = f"""Given this patient profile, add realistic clinical notes and enhance the medical history.
Return ONLY a JSON object with the same structure plus a "clinical_notes" field.

Patient:
{json.dumps(patient, indent=2)}

Add:
1. A brief clinical_notes field (2-3 sentences)
2. Ensure the profile is medically coherent
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "llama-3.1-70b-versatile",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 500,
        "response_format": {"type": "json_object"},
    }

    try:
        response = requests.post(
            GROQ_API_URL, headers=headers, json=payload, timeout=30
        )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        enhanced = json.loads(content)
        return enhanced
    except Exception as e:
        print(f"    LLM enhancement failed: {e}")
        patient["clinical_notes"] = (
            f"Patient presents with {patient['diagnosis']['primary']}. ECOG {patient['ecog_status']}."
        )
        return patient


def main():
    print("=" * 60)
    print("TrialMatch AI - Generating Synthetic Patient Records")
    print("=" * 60)

    load_env()

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    NUM_PATIENTS = 50
    patients = []

    print(f"\nGenerating {NUM_PATIENTS} patient records...")

    for i in range(NUM_PATIENTS):
        patient = generate_patient(i + 1)

        if i < 20:
            patient = enhance_with_llm(patient)
            time.sleep(1.2)

        patients.append(patient)
        print(
            f"  [{i + 1}/{NUM_PATIENTS}] {patient['patient_id']} - {patient['diagnosis']['primary']}"
        )

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(patients, f, indent=2, ensure_ascii=False)

    file_size = os.path.getsize(OUTPUT_FILE)
    print(f"\nGenerated {len(patients)} patient records")
    print(f"Saved to: {OUTPUT_FILE}")
    print(f"File size: {file_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
