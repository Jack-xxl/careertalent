# -*- coding: utf-8 -*-
"""
TalentAI 职业库重构 - 使用 careers_240.csv 生成新职业库
8 Career Families → 40 Career Tracks → 240 Careers

注意：
- 仅替换职业数据来源，不更改前端/算法使用的字段结构
- 保持与原有 careers-database.json 字段完全兼容
"""

import csv
import json
import os
import random
from typing import Dict, Tuple, List

ABILITIES = ["T1_language", "T2_logic", "T3_spatial", "T4_music", "T5_bodily", "T6_interpersonal", "T7_intrapersonal", "T8_naturalist"]
AI_TYPES = ["ai_native", "ai_augmented", "traditional_ai_recast", "human_core"]
ENTRY_BARRIERS = ["低", "中", "高"]
GROWTH_RATES = ["爆发期", "高速增长", "稳定增长", "新兴领域"]
SALARY_TEMPLATES = [
    ("15-50万/年", "初级15-25万，高级30-50万"),
    ("20-60万/年", "大厂30-60万，创业公司20-40万"),
    ("25-80万/年", "技术岗25-50万，专家50-80万"),
    ("30-90万/年", "资深30-60万，首席60-90万"),
    ("18-70万/年", "入门18-35万，高级45-70万"),
]
FUTURE_DEMAND = ["高", "中高", "中", "中低"]
INCOME_POTENTIAL = ["高", "中高", "中"]


def pick_abilities(n: int = 3, lo: float = 6.0, hi: float = 8.5) -> Dict[str, float]:
    chosen = random.sample(ABILITIES, n)
    return {k: round(random.uniform(lo, hi), 1) for k in chosen}


def pick_bonus(exclude_keys: List[str]) -> Dict[str, float]:
    pool = [a for a in ABILITIES if a not in exclude_keys]
    k = random.choice(pool)
    return {k: round(random.uniform(0.2, 0.4), 1)}


# 按职业家族设定基础 fit 区间（T/P/W/M）
def _fit_high() -> float:
    return round(random.uniform(0.88, 0.98), 2)


def _fit_mid() -> float:
    return round(random.uniform(0.82, 0.94), 2)


def _fit_low() -> float:
    return round(random.uniform(0.76, 0.88), 2)


FAMILY_FIT = {
    "Creator": {"T": _fit_high, "P": _fit_high, "W": _fit_mid, "M": _fit_mid},
    "Solver": {"T": _fit_high, "P": _fit_mid, "W": _fit_mid, "M": _fit_high},
    "Organizer": {"T": _fit_mid, "P": _fit_high, "W": _fit_high, "M": _fit_high},
    "Influencer": {"T": _fit_mid, "P": _fit_high, "W": _fit_mid, "M": _fit_mid},
    "Explorer": {"T": _fit_high, "P": _fit_high, "W": _fit_mid, "M": _fit_mid},
    "Builder": {"T": _fit_high, "P": _fit_mid, "W": _fit_high, "M": _fit_high},
    "Helper": {"T": _fit_mid, "P": _fit_high, "W": _fit_high, "M": _fit_mid},
    "Operator": {"T": _fit_mid, "P": _fit_mid, "W": _fit_high, "M": _fit_mid},
}


# fit_A 按赛道类型分档（AI≈0.9, 技术≈0.8, 普通≈0.6, 传统≈0.4）
TRACK_FIT_A = {
    "ai_engineering": (0.86, 0.94),
    "software_engineering": (0.76, 0.84),
    "data_science": (0.76, 0.84),
    "cyber_security": (0.76, 0.84),
    "advanced_tech_rd": (0.76, 0.84),
    "compute_infra": (0.76, 0.84),
    "blockchain_tech": (0.76, 0.84),
    "digital_content_creation": (0.76, 0.84),
    "visual_design_branding": (0.76, 0.84),
    "digital_art_entertainment": (0.76, 0.84),
    "educational_content_design": (0.86, 0.94),
    "game_content_design": (0.76, 0.84),
    "product_management": (0.76, 0.84),
    "business_operations": (0.56, 0.64),
    "strategy_consulting": (0.56, 0.64),
    "project_management": (0.56, 0.64),
    "hr_management": (0.56, 0.64),
    "entrepreneurship_leadership": (0.56, 0.64),
    "business_dev_sales": (0.56, 0.64),
    "marketing_branding": (0.56, 0.64),
    "investment_capital": (0.56, 0.64),
    "public_relations": (0.56, 0.64),
    "scientific_research": (0.56, 0.64),
    "social_policy_research": (0.56, 0.64),
    "user_behavioral_research": (0.56, 0.64),
    "aerospace": (0.76, 0.84),
    "ocean_science": (0.76, 0.84),
    "environment_climate": (0.76, 0.84),
    "intelligent_manufacturing": (0.76, 0.84),
    "engineering_design": (0.76, 0.84),
    "architecture_urban": (0.76, 0.84),
    "new_energy": (0.76, 0.84),
    "agri_tech": (0.76, 0.84),
    "healthcare": (0.56, 0.64),
    "animal_health": (0.56, 0.64),
    "education_growth": (0.84, 0.92),
    "social_service": (0.56, 0.64),
    "ecommerce_ops": (0.76, 0.84),
    "business_automation_ops": (0.84, 0.92),
    "logistics_supply_chain": (0.76, 0.84),
}


def _fit_a_for_track(track_id: str) -> float:
    lo, hi = TRACK_FIT_A.get(track_id, (0.56, 0.64))
    return round(random.uniform(lo, hi), 2)


def pick_fit_for_family(career_family: str, track_id: str) -> Dict[str, float]:
    fam = FAMILY_FIT.get(career_family, FAMILY_FIT["Creator"])
    return {
        "fit_T": fam["T"](),
        "fit_P": fam["P"](),
        "fit_W": fam["W"](),
        "fit_M": fam["M"](),
        "fit_A": _fit_a_for_track(track_id),
    }


# 40 条职业方向定义： (family_cap, track_id, name_en, name_zh, trend_tag)
TRACKS_40: List[Tuple[str, str, str, str, str]] = [
    # Creator
    ("Creator", "digital_content_creation", "Digital Content Creation", "数字内容创作", "AI + 内容爆发"),
    ("Creator", "visual_design_branding", "Visual Design & Branding", "视觉设计与品牌", "品牌竞争"),
    ("Creator", "digital_art_entertainment", "Digital Art & Entertainment", "数字艺术娱乐", "虚拟世界"),
    ("Creator", "educational_content_design", "Educational Content Design", "教育内容设计", "AI教育"),
    ("Creator", "game_content_design", "Game Content Design", "游戏内容设计", "游戏产业"),
    # Solver
    ("Solver", "ai_engineering", "AI Engineering", "AI工程", "核心技术"),
    ("Solver", "software_engineering", "Software Engineering", "软件工程", "长期需求"),
    ("Solver", "data_science", "Data Science", "数据科学", "数据经济"),
    ("Solver", "cyber_security", "Cyber Security", "网络安全", "安全需求"),
    ("Solver", "advanced_tech_rd", "Advanced Technology R&D", "高级技术研发", "科技前沿"),
    ("Solver", "compute_infra", "Communication & Compute Infrastructure", "通信与算力基础设施", "算力基础设施"),
    ("Solver", "blockchain_tech", "Blockchain Technology", "区块链技术", "Web3"),
    # Organizer
    ("Organizer", "product_management", "Product Management", "产品管理", "技术+商业"),
    ("Organizer", "business_operations", "Business Operations", "企业运营", "增长驱动"),
    ("Organizer", "strategy_consulting", "Strategy & Consulting", "战略咨询", "复杂组织"),
    ("Organizer", "project_management", "Project Management", "项目管理", "大型项目"),
    ("Organizer", "hr_management", "People & HR Management", "人力资源", "人才时代"),
    # Influencer
    ("Influencer", "entrepreneurship_leadership", "Entrepreneurship & Leadership", "创业与企业领导", "AI创业"),
    ("Influencer", "business_dev_sales", "Business Development & Sales", "商业拓展销售", "企业增长"),
    ("Influencer", "marketing_branding", "Marketing & Branding", "市场营销品牌", "注意力经济"),
    ("Influencer", "investment_capital", "Investment & Capital", "投资与资本", "资本推动"),
    ("Influencer", "public_relations", "Public Relations", "公共关系", "品牌影响"),
    # Explorer
    ("Explorer", "scientific_research", "Scientific Research", "科学研究", "科技突破"),
    ("Explorer", "social_policy_research", "Social & Policy Research", "社会政策研究", "政策复杂"),
    ("Explorer", "user_behavioral_research", "User & Behavioral Research", "用户行为研究", "理解人类"),
    ("Explorer", "aerospace", "Aerospace", "航空航天", "航天探索"),
    ("Explorer", "ocean_science", "Ocean Science", "海洋科学", "蓝色星球"),
    ("Explorer", "environment_climate", "Environment & Climate Science", "环境气候科学", "可持续发展"),
    # Builder
    ("Builder", "intelligent_manufacturing", "Intelligent Manufacturing", "智能制造", "AI制造"),
    ("Builder", "engineering_design", "Engineering Design", "工程设计", "制造升级"),
    ("Builder", "architecture_urban", "Architecture & Urban Systems", "建筑城市", "智慧城市"),
    ("Builder", "new_energy", "New Energy", "新能源", "能源革命"),
    ("Builder", "agri_tech", "Agritech", "农业科技", "数字农业"),
    # Helper
    ("Helper", "healthcare", "Healthcare", "医疗健康", "健康需求"),
    ("Helper", "animal_health", "Animal Health", "动物医疗", "宠物经济"),
    ("Helper", "education_growth", "Education & Growth", "教育成长", "教育升级"),
    ("Helper", "social_service", "Social Service", "社会服务", "社会支持"),
    # Operator
    ("Operator", "ecommerce_ops", "E-commerce & Platform Ops", "电商平台运营", "数字经济"),
    ("Operator", "business_automation_ops", "Business Automation Ops", "商业自动化运营", "AI运营"),
    ("Operator", "logistics_supply_chain", "Logistics & Supply Chain", "物流供应链", "智能物流"),
]


def load_csv_rows() -> List[Tuple[str, str, str]]:
    """读取 careers_240.csv，返回 (family, track_zh, career_zh) 列表"""
    csv_path = os.path.join(
        os.path.expanduser("~"),
        "OneDrive",
        "Documents",
        "WeChat Files",
        "wxid_rmw9xugr8i0312",
        "FileStorage",
        "File",
        "2026-03",
        "careers_240.csv",
    )
    rows: List[Tuple[str, str, str]] = []
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            fam = (r.get("family") or "").strip()
            track_zh = (r.get("track_zh") or "").strip()
            career_zh = (r.get("career_zh") or "").strip()
            if not fam or not track_zh or not career_zh:
                continue
            rows.append((fam, track_zh, career_zh))
    return rows


def build_track_map() -> Dict[Tuple[str, str], Tuple[str, str, str, str, str]]:
    """(family_cap, track_zh) -> track tuple"""
    m: Dict[Tuple[str, str], Tuple[str, str, str, str, str]] = {}
    for fam, tid, en, zh, tag in TRACKS_40:
        m[(fam, zh)] = (fam, tid, en, zh, tag)
    return m


def make_career_id(family: str, track_id: str, index: int) -> str:
    return f"{family.lower()}_{track_id}_{index:03d}"


def one_career(family_raw: str, track_zh: str, career_zh: str, idx: int,
               track_info: Tuple[str, str, str, str, str]) -> Dict:
    career_family, track_id, track_name_en, track_name_zh, trend_tag = track_info
    family_key = family_raw.lower()

    required = pick_abilities(3, 6.2, 8.4)
    bonus = pick_bonus(list(required.keys()))
    repl = random.randint(18, 48)
    collab = random.randint(75, 95)
    newbie = random.randint(72, 95)
    exp_disrupt = random.randint(75, 92)
    salary, salary_detail = random.choice(SALARY_TEMPLATES)
    growth = random.choice(GROWTH_RATES)
    ai_type = random.choice(AI_TYPES)
    barrier = random.choice(ENTRY_BARRIERS)
    future_demand = random.choice(FUTURE_DEMAND)
    income_potential = random.choice(INCOME_POTENTIAL)
    fits = pick_fit_for_family(career_family, track_id)

    cid = make_career_id(career_family, track_id, idx)

    return {
        "career_id": cid,
        "id": cid,
        "name": career_zh,
        "name_zh": career_zh,
        "name_en": career_zh,
        "career_family": career_family,
        "career_track": track_name_en,
        "career_track_id": track_id,
        "career_track_zh": track_name_zh,
        "family": family_key,
        "description": f"面向{career_zh}角色的职责：在AI时代结合专业与协作能力创造价值。",
        "trend_tag": trend_tag,
        "future_demand": future_demand,
        "ai_replacement_risk": repl,
        "income_potential": income_potential,
        "fit_T": fits["fit_T"],
        "fit_P": fits["fit_P"],
        "fit_W": fits["fit_W"],
        "fit_M": fits["fit_M"],
        "fit_A": fits["fit_A"],
        "aiUpgradeType": ai_type,
        "requiredAbilities": required,
        "bonusAbilities": bonus,
        "aiImpact": {
            "replacementRisk": repl,
            "replacementRiskText": f"5年替代风险：{repl}%",
            "collaborationPotential": collab,
            "growthRate": growth,
            "salaryRange": salary,
            "salaryRangeDetail": salary_detail,
            "newbieAdvantage": newbie,
            "newbieAdvantageReason": "新兴领域或工具迭代快，新人学习曲线优势明显。",
            "experienceDisruptionIndex": exp_disrupt,
        },
        "keySkills": ["专业基础", "AI工具协作", "跨域沟通", "持续学习"],
        "whyNewbieCanWin": "领域处于形成期或工具快速迭代，正确方法论与执行力比资历更重要。",
        "entryBarrier": barrier,
        "entryBarrierDetail": "需具备相应专业基础与学习意愿",
        "careerPath": f"初级{career_zh} → 资深{career_zh} → 领域专家/负责人",
        "realWorldExample": "新人通过系统学习与项目实践，在半年内即可参与核心交付并获得认可。",
    }


def main():
    random.seed(42)
    rows = load_csv_rows()
    track_map = build_track_map()

    careers: Dict[str, Dict] = {}
    per_track_counter: Dict[str, int] = {}

    for fam_raw, track_zh, career_zh in rows:
        family_cap = fam_raw.strip().title()
        key = (family_cap, track_zh)
        track_info = track_map.get(key)
        if not track_info:
            # 未显式配置的 track，跳过，避免生成错误数据
            continue
        tid = track_info[1]
        per_track_counter[tid] = per_track_counter.get(tid, 0) + 1
        idx = per_track_counter[tid]
        career = one_career(family_cap, track_zh, career_zh, idx, track_info)
        careers[career["career_id"]] = career

    tracks_meta = [
        {"id": t[1], "family": t[0], "name_en": t[2], "name_zh": t[3], "trend_tag": t[4]}
        for t in TRACKS_40
    ]

    obj = {
        "metadata": {
            "version": "3.1.0",
            "lastUpdate": "2026-03-07",
            "structure": "8 Families → 40 Tracks → 240 Careers",
            "totalCareers": len(careers),
            "career_families": ["Creator", "Solver", "Organizer", "Influencer", "Explorer", "Builder", "Helper", "Operator"],
            "career_tracks": tracks_meta,
            "aiEraOptimized": True,
            "newbieAdvantageMin": 70,
            "aiUpgradeTypes": ["ai_native", "ai_augmented", "traditional_ai_recast", "human_core"],
        },
        "careers": careers,
    }
    out_path = __file__.replace("build_careers_200.py", "careers-database.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
    print("Written:", out_path, "| careers:", len(careers), "| tracks:", len(TRACKS_40))


if __name__ == "__main__":
    main()
