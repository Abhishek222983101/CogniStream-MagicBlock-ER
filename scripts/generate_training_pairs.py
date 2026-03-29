#!/usr/bin/env python3
"""
TrialMatch AI - Generate Training Pairs Locally (No External API)
Creates synthetic training examples for fine-tuning
Output: data/trialmatch_training.jsonl (ChatML format)
"""

import os
import json
import random
from typing import Any

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "trialmatch_training.jsonl")

SYSTEM_PROMPT = """You are TrialMatch, a clinical trial eligibility assessor AI. Given a patient profile and a clinical trial criterion, determine eligibility with reasoning.

Respond ONLY with valid JSON in this exact format:
{
  "status": "ELIGIBLE" | "INELIGIBLE" | "UNCLEAR",
  "confidence": <number 0-100>,
  "criterion_category": "age" | "gender" | "diagnosis" | "stage" | "biomarker" | "lab_value" | "prior_treatment" | "comorbidity" | "geographic" | "other",
  "reasoning": "<brief medical reasoning explaining the assessment>"
}"""


def load_data():
    with open(os.path.join(DATA_DIR, "patients.json")) as f:
        patients = json.load(f)
    with open(os.path.join(DATA_DIR, "trials.json")) as f:
        trials = json.load(f)
    return patients, trials


def format_patient(patient: dict) -> str:
    parts = []
    parts.append(f"Age: {patient['demographics']['age']} years")
    parts.append(f"Gender: {patient['demographics']['gender']}")
    parts.append(
        f"Location: {patient['demographics']['city']}, {patient['demographics']['state']}"
    )

    diag = patient["diagnosis"]
    diag_str = f"Diagnosis: {diag['primary']}"
    if diag.get("subtype"):
        diag_str += f" ({diag['subtype']})"
    if diag.get("stage"):
        diag_str += f", Stage {diag['stage']}"
    parts.append(diag_str)

    if diag.get("biomarkers"):
        biomarker_strs = [f"{k}: {v}" for k, v in diag["biomarkers"].items()]
        parts.append(f"Biomarkers: {', '.join(biomarker_strs)}")

    parts.append(f"ECOG Status: {patient['ecog_status']}")

    if patient.get("medical_history"):
        parts.append(f"Comorbidities: {', '.join(patient['medical_history'])}")

    if patient.get("prior_treatments"):
        treatments = [t["name"] for t in patient["prior_treatments"]]
        parts.append(f"Prior Treatments: {', '.join(treatments)}")

    labs = patient.get("lab_values", {})
    if labs:
        lab_str = f"Labs: Hb={labs.get('hemoglobin')} g/dL, WBC={labs.get('wbc')}, Plt={labs.get('platelets')}, Cr={labs.get('creatinine')} mg/dL"
        parts.append(lab_str)

    return "\n".join(parts)


def generate_training_examples(patient: dict, trial: dict) -> list[dict]:
    examples = []
    patient_text = format_patient(patient)
    age = patient["demographics"]["age"]
    gender = patient["demographics"]["gender"]
    diagnosis = patient["diagnosis"]["primary"]
    stage = patient["diagnosis"].get("stage")
    biomarkers = patient["diagnosis"].get("biomarkers", {})
    ecog = patient["ecog_status"]
    labs = patient.get("lab_values", {})

    criteria = [
        {
            "text": "Patients must be aged 18 years or older",
            "type": "age",
            "assessment": {
                "status": "ELIGIBLE" if age >= 18 else "INELIGIBLE",
                "confidence": 100 if age >= 18 else 95,
                "criterion_category": "age",
                "reasoning": f"Patient is {age} years old, which {'meets' if age >= 18 else 'does not meet'} the minimum age requirement of 18 years.",
            },
        },
        {
            "text": "Patients must be aged 18-75 years inclusive",
            "type": "age",
            "assessment": {
                "status": "ELIGIBLE" if 18 <= age <= 75 else "INELIGIBLE",
                "confidence": 100,
                "criterion_category": "age",
                "reasoning": f"Patient is {age} years old. Age requirement is 18-75 years. {'Within range.' if 18 <= age <= 75 else 'Outside specified age range.'}",
            },
        },
        {
            "text": "Male patients only",
            "type": "gender",
            "assessment": {
                "status": "ELIGIBLE" if gender == "Male" else "INELIGIBLE",
                "confidence": 100,
                "criterion_category": "gender",
                "reasoning": f"Patient is {gender}. Trial requires male patients only.",
            },
        },
        {
            "text": "Female patients only",
            "type": "gender",
            "assessment": {
                "status": "ELIGIBLE" if gender == "Female" else "INELIGIBLE",
                "confidence": 100,
                "criterion_category": "gender",
                "reasoning": f"Patient is {gender}. Trial requires female patients only.",
            },
        },
        {
            "text": f"Histologically confirmed {diagnosis}",
            "type": "diagnosis",
            "assessment": {
                "status": "ELIGIBLE",
                "confidence": 90,
                "criterion_category": "diagnosis",
                "reasoning": f"Patient has confirmed diagnosis of {diagnosis}, meeting this criterion.",
            },
        },
        {
            "text": "ECOG performance status 0-2",
            "type": "ecog",
            "assessment": {
                "status": "ELIGIBLE" if ecog <= 2 else "INELIGIBLE",
                "confidence": 95,
                "criterion_category": "other",
                "reasoning": f"Patient ECOG status is {ecog}. {'Meets requirement of 0-2.' if ecog <= 2 else 'Exceeds maximum allowed ECOG of 2.'}",
            },
        },
        {
            "text": "Adequate organ function: Creatinine <= 1.5 x ULN",
            "type": "lab",
            "assessment": {
                "status": "ELIGIBLE"
                if labs.get("creatinine", 1.0) <= 1.5
                else "INELIGIBLE",
                "confidence": 90,
                "criterion_category": "lab_value",
                "reasoning": f"Patient creatinine is {labs.get('creatinine', 1.0)} mg/dL. {'Within acceptable range.' if labs.get('creatinine', 1.0) <= 1.5 else 'Exceeds 1.5 x ULN threshold.'}",
            },
        },
        {
            "text": "Hemoglobin >= 9.0 g/dL",
            "type": "lab",
            "assessment": {
                "status": "ELIGIBLE"
                if labs.get("hemoglobin", 12.0) >= 9.0
                else "INELIGIBLE",
                "confidence": 90,
                "criterion_category": "lab_value",
                "reasoning": f"Patient hemoglobin is {labs.get('hemoglobin', 12.0)} g/dL. {'Meets minimum threshold.' if labs.get('hemoglobin', 12.0) >= 9.0 else 'Below required 9.0 g/dL.'}",
            },
        },
        {
            "text": "Platelets >= 100,000/uL",
            "type": "lab",
            "assessment": {
                "status": "ELIGIBLE"
                if labs.get("platelets", 200000) >= 100000
                else "INELIGIBLE",
                "confidence": 90,
                "criterion_category": "lab_value",
                "reasoning": f"Patient platelet count is {labs.get('platelets', 200000)}/uL. {'Adequate.' if labs.get('platelets', 200000) >= 100000 else 'Below threshold.'}",
            },
        },
    ]

    if "Lung" in diagnosis and biomarkers:
        egfr = biomarkers.get("EGFR", "")
        criteria.append(
            {
                "text": "Must have EGFR activating mutation (Exon 19 deletion or L858R)",
                "type": "biomarker",
                "assessment": {
                    "status": "ELIGIBLE"
                    if "Exon 19" in egfr or "L858R" in egfr
                    else "INELIGIBLE",
                    "confidence": 95,
                    "criterion_category": "biomarker",
                    "reasoning": f"Patient EGFR status: {egfr}. {'This is an activating mutation.' if 'Exon 19' in egfr or 'L858R' in egfr else 'Not a recognized activating mutation.'}",
                },
            }
        )

    if "Breast" in diagnosis and biomarkers:
        her2 = biomarkers.get("HER2", "")
        criteria.append(
            {
                "text": "HER2-negative breast cancer",
                "type": "biomarker",
                "assessment": {
                    "status": "ELIGIBLE" if her2 == "Negative" else "INELIGIBLE",
                    "confidence": 95,
                    "criterion_category": "biomarker",
                    "reasoning": f"Patient HER2 status: {her2}. {'Trial requires HER2-negative.' if her2 == 'Negative' else 'Trial requires HER2-negative; patient is HER2-positive.'}",
                },
            }
        )

    if stage:
        stage_num = 0
        if stage == "I":
            stage_num = 1
        elif stage == "II":
            stage_num = 2
        elif stage.startswith("III"):
            stage_num = 3
        elif stage == "IV":
            stage_num = 4

        criteria.append(
            {
                "text": "Locally advanced or metastatic disease (Stage III/IV)",
                "type": "stage",
                "assessment": {
                    "status": "ELIGIBLE" if stage_num >= 3 else "INELIGIBLE",
                    "confidence": 90,
                    "criterion_category": "stage",
                    "reasoning": f"Patient has Stage {stage} disease. {'Qualifies as locally advanced/metastatic.' if stage_num >= 3 else 'Does not meet locally advanced/metastatic requirement.'}",
                },
            }
        )

    selected = random.sample(criteria, min(3, len(criteria)))

    for c in selected:
        examples.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": f"PATIENT PROFILE:\n{patient_text}\n\nCRITERION:\n{c['text']}\n\nAssess eligibility and respond with JSON only.",
                    },
                    {"role": "assistant", "content": json.dumps(c["assessment"])},
                ]
            }
        )

    return examples


def main():
    print("=" * 60)
    print("TrialMatch AI - Generating Training Pairs Locally")
    print("=" * 60)

    patients, trials = load_data()
    print(f"\nLoaded {len(patients)} patients and {len(trials)} trials")

    random.seed(42)

    training_data = []
    target_count = 200

    selected_patients = random.sample(patients, min(30, len(patients)))
    selected_trials = random.sample(trials, min(30, len(trials)))

    print(f"Generating {target_count} training examples...\n")

    for patient in selected_patients:
        for trial in selected_trials:
            if len(training_data) >= target_count:
                break

            examples = generate_training_examples(patient, trial)
            training_data.extend(examples)
            print(
                f"  [{len(training_data)}/{target_count}] {patient['patient_id']} x {trial['trial_id']}"
            )

            if len(training_data) >= target_count:
                break

    training_data = training_data[:target_count]

    with open(OUTPUT_FILE, "w") as f:
        for entry in training_data:
            f.write(json.dumps(entry) + "\n")

    file_size = os.path.getsize(OUTPUT_FILE)
    print(f"\nGenerated {len(training_data)} training examples")
    print(f"Saved to: {OUTPUT_FILE}")
    print(f"File size: {file_size / 1024:.1f} KB")

    print(f"\nSample entry:")
    sample = training_data[0]
    print(f"  System: {sample['messages'][0]['content'][:60]}...")
    print(f"  User: {sample['messages'][1]['content'][:100]}...")
    print(f"  Assistant: {sample['messages'][2]['content']}")


if __name__ == "__main__":
    main()
