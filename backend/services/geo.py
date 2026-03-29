"""
Geographic Service - Distance calculations for trial-patient proximity.
Uses Haversine formula (no external API needed).
"""

import math
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Major Indian city coordinates for fallback lookups
INDIAN_CITIES = {
    "mumbai": (19.0760, 72.8777),
    "delhi": (28.7041, 77.1025),
    "new delhi": (28.6139, 77.2090),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "kolkata": (22.5726, 88.3639),
    "ahmedabad": (23.0225, 72.5714),
    "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462),
    "chandigarh": (30.7333, 76.7794),
    "bhopal": (23.2599, 77.4126),
    "patna": (25.6093, 85.1376),
    "thiruvananthapuram": (8.5241, 76.9366),
    "kochi": (9.9312, 76.2673),
    "coimbatore": (11.0168, 76.9558),
    "nagpur": (21.1458, 79.0882),
    "indore": (22.7196, 75.8577),
    "varanasi": (25.3176, 82.9739),
    "guwahati": (26.1445, 91.7362),
    "bhubaneswar": (20.2961, 85.8245),
    "dehradun": (30.3165, 78.0322),
    "ranchi": (23.3441, 85.3096),
    "srinagar": (34.0837, 74.7973),
    "visakhapatnam": (17.6868, 83.2185),
    "mangalore": (12.9141, 74.8560),
    "mysore": (12.2958, 76.6394),
    "mysuru": (12.2958, 76.6394),
    "vellore": (12.9165, 79.1325),
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth.
    Returns distance in kilometers.
    """
    R = 6371.0  # Earth's radius in km

    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def get_city_coords(city_name: str) -> Optional[tuple[float, float]]:
    """Look up coordinates for an Indian city. Returns (lat, lng) or None."""
    if not city_name:
        return None
    return INDIAN_CITIES.get(city_name.lower().strip())


def calculate_distance(
    patient_lat: Optional[float],
    patient_lng: Optional[float],
    patient_city: Optional[str],
    trial_lat: Optional[float],
    trial_lng: Optional[float],
    trial_city: Optional[str],
) -> Optional[float]:
    """
    Calculate distance between patient and trial location.
    Falls back to city coordinate lookup if lat/lng not provided.
    Returns distance in km, or None if can't compute.
    """
    # Resolve patient coordinates
    p_lat, p_lng = patient_lat, patient_lng
    if (p_lat is None or p_lng is None) and patient_city:
        coords = get_city_coords(patient_city)
        if coords:
            p_lat, p_lng = coords

    # Resolve trial coordinates
    t_lat, t_lng = trial_lat, trial_lng
    if (t_lat is None or t_lng is None) and trial_city:
        coords = get_city_coords(trial_city)
        if coords:
            t_lat, t_lng = coords

    # Compute distance if we have both coordinates
    if (
        p_lat is not None
        and p_lng is not None
        and t_lat is not None
        and t_lng is not None
    ):
        return round(haversine_km(p_lat, p_lng, t_lat, t_lng), 1)

    return None


def geo_score(distance_km: Optional[float], max_distance_km: float = 500.0) -> float:
    """
    Convert distance to a 0-100 score.
    0 km = 100 (perfect), max_distance = 0 (too far).
    Returns 0 if distance unknown.
    """
    if distance_km is None:
        return 50.0  # Neutral score if unknown
    if distance_km <= 0:
        return 100.0
    score = max(0.0, 100.0 - (distance_km / max_distance_km * 100.0))
    return round(score, 2)
