#!/usr/bin/env python3
"""
TrialMatch AI - Fetch Indian Clinical Trials from ClinicalTrials.gov API
Fetches real trials filtered by location=India, conditions=Cancer/Diabetes/Cardiovascular/TB
Output: data/trials.json
"""

import os
import json
import time
import requests
from typing import Any
from datetime import datetime

API_BASE = "https://clinicaltrials.gov/api/v2/studies"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "..", "data", "trials.json")

INDIAN_CITIES = {
    "Mumbai": {"lat": 19.0760, "lng": 72.8777, "state": "Maharashtra"},
    "Delhi": {"lat": 28.6139, "lng": 77.2090, "state": "Delhi"},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946, "state": "Karnataka"},
    "Chennai": {"lat": 13.0827, "lng": 80.2707, "state": "Tamil Nadu"},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867, "state": "Telangana"},
    "Pune": {"lat": 18.5204, "lng": 73.8567, "state": "Maharashtra"},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639, "state": "West Bengal"},
    "Ahmedabad": {"lat": 23.0225, "lng": 72.5714, "state": "Gujarat"},
    "Vellore": {"lat": 12.9165, "lng": 79.1325, "state": "Tamil Nadu"},
    "Manipal": {"lat": 13.3429, "lng": 74.7876, "state": "Karnataka"},
}

SEARCH_CONDITIONS = [
    "cancer",
    "lung cancer",
    "breast cancer",
    "diabetes",
    "cardiovascular",
    "tuberculosis",
    "hepatitis",
    "stroke",
]


def fetch_trials(condition: str, max_results: int = 20) -> list[dict[str, Any]]:
    trials = []

    params = {
        "query.locn": "India",
        "query.cond": condition,
        "filter.overallStatus": "RECRUITING,NOT_YET_RECRUITING",
        "pageSize": max_results,
        "format": "json",
    }

    try:
        print(f"  Fetching trials for: {condition}...")
        response = requests.get(API_BASE, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        studies = data.get("studies", [])
        print(f"    Found {len(studies)} studies")

        for study in studies:
            trial = parse_trial(study)
            if trial:
                trials.append(trial)

        time.sleep(0.5)
    except Exception as e:
        print(f"    Error: {e}")

    return trials


def parse_trial(study: dict) -> dict | None:
    try:
        protocol = study.get("protocolSection", {})

        nct_id = protocol.get("identificationModule", {}).get("nctId", "")
        title = protocol.get("identificationModule", {}).get(
            "officialTitle", ""
        ) or protocol.get("identificationModule", {}).get("briefTitle", "")

        conditions = protocol.get("conditionsModule", {}).get("conditions", [])
        status = protocol.get("statusModule", {}).get("overallStatus", "Unknown")

        phase_list = protocol.get("designModule", {}).get("phases", [])
        phase = phase_list[0] if phase_list else "Unknown"

        sponsor = (
            protocol.get("sponsorCollaboratorsModule", {})
            .get("leadSponsor", {})
            .get("name", "Unknown")
        )

        eligibility = protocol.get("eligibilityModule", {})
        inclusion_criteria = eligibility.get("eligibilityCriteria", "")

        min_age = eligibility.get("minimumAge", "N/A")
        max_age = eligibility.get("maximumAge", "N/A")
        gender = eligibility.get("gender", "All")

        locations = []
        contacts_locations = protocol.get("contactsLocationsModule", {}).get(
            "locations", []
        )

        for loc in contacts_locations:
            city = loc.get("city", "")
            country = loc.get("country", "")
            facility = loc.get("facility", "")

            if "India" in country or not country:
                city_info = INDIAN_CITIES.get(
                    city, {"lat": 20.0, "lng": 77.0, "state": "Unknown"}
                )
                locations.append(
                    {
                        "facility": facility or f"Hospital in {city}",
                        "city": city,
                        "state": city_info["state"],
                        "country": "India",
                        "lat": city_info["lat"],
                        "lng": city_info["lng"],
                    }
                )

        if not locations:
            default_city = "Mumbai"
            city_info = INDIAN_CITIES[default_city]
            locations.append(
                {
                    "facility": "Multi-center Trial in India",
                    "city": default_city,
                    "state": city_info["state"],
                    "country": "India",
                    "lat": city_info["lat"],
                    "lng": city_info["lng"],
                }
            )

        inclusion_text, exclusion_text = parse_criteria_sections(inclusion_criteria)

        return {
            "trial_id": nct_id,
            "title": title,
            "conditions": conditions,
            "phase": phase,
            "status": status,
            "sponsor": sponsor,
            "locations": locations[:5],
            "inclusion_criteria_raw": inclusion_text,
            "exclusion_criteria_raw": exclusion_text,
            "age_range": {"min": min_age, "max": max_age},
            "gender": gender,
            "fetched_at": datetime.now().isoformat(),
        }
    except Exception as e:
        print(f"    Parse error: {e}")
        return None


def parse_criteria_sections(criteria_text: str) -> tuple[str, str]:
    inclusion = ""
    exclusion = ""

    if not criteria_text:
        return inclusion, exclusion

    lines = criteria_text.split("\n")
    current_section = "inclusion"

    for line in lines:
        lower_line = line.lower().strip()

        if "exclusion" in lower_line and (
            "criteria" in lower_line or ":" in lower_line
        ):
            current_section = "exclusion"
            continue
        elif "inclusion" in lower_line and (
            "criteria" in lower_line or ":" in lower_line
        ):
            current_section = "inclusion"
            continue

        if current_section == "inclusion":
            inclusion += line + "\n"
        else:
            exclusion += line + "\n"

    return inclusion.strip(), exclusion.strip()


def main():
    print("=" * 60)
    print("TrialMatch AI - Fetching Indian Clinical Trials")
    print("=" * 60)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    all_trials = []
    seen_ids = set()

    for condition in SEARCH_CONDITIONS:
        trials = fetch_trials(condition, max_results=15)

        for trial in trials:
            if trial["trial_id"] not in seen_ids:
                all_trials.append(trial)
                seen_ids.add(trial["trial_id"])

        print(f"  Total unique trials: {len(all_trials)}")

    print(f"\nFetched {len(all_trials)} unique trials")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_trials, f, indent=2, ensure_ascii=False)

    print(f"Saved to: {OUTPUT_FILE}")

    if all_trials:
        file_size = os.path.getsize(OUTPUT_FILE)
        print(f"File size: {file_size / 1024:.1f} KB")
        print(f"\nSample trial:")
        sample = all_trials[0]
        print(f"  ID: {sample['trial_id']}")
        print(f"  Title: {sample['title'][:80]}...")
        print(f"  Conditions: {sample['conditions']}")
        print(f"  Locations: {len(sample['locations'])} site(s)")


if __name__ == "__main__":
    main()
