# -*- coding: utf-8 -*-
"""Batch add w_weights to all careers in careers-database.json by family."""
import json
import os

W_WEIGHTS_BY_FAMILY = {
    "solver": {"W1": 0.35, "W2": 0.15, "W3": 0.10, "W4": 0.25, "W5": 0.10, "W6": 0.03, "W7": 0.02},
    "helper": {"W1": 0.10, "W2": 0.20, "W3": 0.15, "W4": 0.15, "W5": 0.10, "W6": 0.20, "W7": 0.10},
    "creator": {"W1": 0.10, "W2": 0.10, "W3": 0.15, "W4": 0.20, "W5": 0.25, "W6": 0.15, "W7": 0.05},
    "influencer": {"W1": 0.25, "W2": 0.10, "W3": 0.20, "W4": 0.15, "W5": 0.15, "W6": 0.05, "W7": 0.10},
    "explorer": {"W1": 0.10, "W2": 0.15, "W3": 0.10, "W4": 0.30, "W5": 0.15, "W6": 0.15, "W7": 0.05},
    "builder": {"W1": 0.25, "W2": 0.25, "W3": 0.15, "W4": 0.20, "W5": 0.10, "W6": 0.03, "W7": 0.02},
    "organizer": {"W1": 0.20, "W2": 0.20, "W3": 0.15, "W4": 0.20, "W5": 0.15, "W6": 0.05, "W7": 0.05},
    "operator": {"W1": 0.20, "W2": 0.25, "W3": 0.15, "W4": 0.20, "W5": 0.10, "W6": 0.05, "W7": 0.05},
    "guardian": {"W1": 0.20, "W2": 0.25, "W3": 0.15, "W4": 0.20, "W5": 0.10, "W6": 0.05, "W7": 0.05},
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, "careers-database.json")


def main():
    with open(DB_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    careers = data.get("careers")
    if not careers or not isinstance(careers, dict):
        print("No 'careers' object found.")
        return

    count = 0
    for cid, career in careers.items():
        family = (career.get("family") or career.get("career_family") or "creator").strip().lower()
        if family == "guardian":
            family = "builder"  # map guardian to builder weights if you prefer; here we have guardian in map
        weights = W_WEIGHTS_BY_FAMILY.get(family, W_WEIGHTS_BY_FAMILY["creator"])
        career["w_weights"] = dict(weights)
        count += 1

    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Added w_weights to {count} careers.")


if __name__ == "__main__":
    main()
