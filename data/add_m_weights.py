# -*- coding: utf-8 -*-
"""Batch add m_weights to all careers in careers-database.json by family."""
import json
import os

M_WEIGHTS_BY_FAMILY = {
    "solver": {"M-SYS": 0.40, "M-STR": 0.25, "M-RSK": 0.10, "M-INT": 0.15, "M-MET": 0.10},
    "helper": {"M-SYS": 0.20, "M-STR": 0.15, "M-RSK": 0.10, "M-INT": 0.40, "M-MET": 0.15},
    "creator": {"M-SYS": 0.15, "M-STR": 0.10, "M-RSK": 0.15, "M-INT": 0.35, "M-MET": 0.25},
    "influencer": {"M-SYS": 0.20, "M-STR": 0.30, "M-RSK": 0.25, "M-INT": 0.15, "M-MET": 0.10},
    "explorer": {"M-SYS": 0.35, "M-STR": 0.20, "M-RSK": 0.10, "M-INT": 0.25, "M-MET": 0.10},
    "builder": {"M-SYS": 0.35, "M-STR": 0.25, "M-RSK": 0.15, "M-INT": 0.10, "M-MET": 0.15},
    "organizer": {"M-SYS": 0.25, "M-STR": 0.30, "M-RSK": 0.15, "M-INT": 0.20, "M-MET": 0.10},
    "operator": {"M-SYS": 0.20, "M-STR": 0.30, "M-RSK": 0.20, "M-INT": 0.15, "M-MET": 0.15},
    "guardian": {"M-SYS": 0.35, "M-STR": 0.25, "M-RSK": 0.15, "M-INT": 0.10, "M-MET": 0.15},
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
        weights = M_WEIGHTS_BY_FAMILY.get(family, M_WEIGHTS_BY_FAMILY["creator"])
        career["m_weights"] = dict(weights)
        count += 1

    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Added m_weights to {count} careers.")


if __name__ == "__main__":
    main()
