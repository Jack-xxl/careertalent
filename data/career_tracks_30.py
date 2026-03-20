# -*- coding: utf-8 -*-
"""8 Career Families → 30 Career Tracks 定义"""

# 从 build 脚本导入 CAREERS_RAW 会循环依赖，故 get_track_for_career 只接收单条职业
FAMILIES = [
    "Creator", "Solver", "Organizer", "Influencer",
    "Explorer", "Builder", "Helper", "Operator"
]

# 30 tracks: (family, track_id, track_name_en, track_name_zh, trend_tag)
TRACKS_30 = [
    # Creator 创造者 (4)
    ("Creator", "digital_content_creation", "Digital Content Creation", "数字内容创作", "AI + 内容爆发"),
    ("Creator", "visual_design_branding", "Visual Design & Branding", "视觉设计与品牌", "品牌竞争越来越重要"),
    ("Creator", "digital_art_entertainment", "Digital Art & Entertainment", "数字艺术与娱乐", "虚拟世界增长"),
    ("Creator", "educational_content_design", "Educational Content Design", "教育内容设计", "AI教育爆发"),
    # Solver 问题解决者 (5)
    ("Solver", "ai_engineering", "AI Engineering", "AI工程", "未来最核心技术职业"),
    ("Solver", "software_engineering", "Software Engineering", "软件工程", "长期需求"),
    ("Solver", "data_science", "Data Science", "数据科学", "数据经济"),
    ("Solver", "cyber_security", "Cyber Security", "网络安全", "AI时代安全需求"),
    ("Solver", "advanced_tech_rd", "Advanced Technology R&D", "高级技术研发", "科技前沿"),
    # Organizer 组织者 (4)
    ("Organizer", "product_management", "Product Management", "产品管理", "技术 + 商业桥梁"),
    ("Organizer", "business_operations", "Business Operations", "企业运营", "增长驱动"),
    ("Organizer", "strategy_consulting", "Strategy & Consulting", "战略与咨询", "复杂组织需要顾问"),
    ("Organizer", "project_management", "Project Management", "项目管理", "大型项目越来越多"),
    # Influencer 影响者 (4)
    ("Influencer", "entrepreneurship_leadership", "Entrepreneurship & Leadership", "创业与企业领导", "AI创业浪潮"),
    ("Influencer", "business_dev_sales", "Business Development & Sales", "商业拓展与销售", "企业增长"),
    ("Influencer", "marketing_branding", "Marketing & Branding", "市场营销与品牌", "注意力竞争"),
    ("Influencer", "investment_capital", "Investment & Capital", "投资与资本", "资本推动创新"),
    # Explorer 探索者 (3)
    ("Explorer", "scientific_research", "Scientific Research", "科学研究", "科技突破"),
    ("Explorer", "social_policy_research", "Social & Policy Research", "社会与政策研究", "政策复杂化"),
    ("Explorer", "user_behavioral_research", "User & Behavioral Research", "用户与行为研究", "理解人类"),
    # Builder 建造者 (4)
    ("Builder", "intelligent_manufacturing", "Intelligent Manufacturing", "智能制造", "AI制造"),
    ("Builder", "engineering_design", "Engineering Design", "工程设计", "制造升级"),
    ("Builder", "architecture_urban", "Architecture & Urban Systems", "建筑与城市", "智慧城市"),
    ("Builder", "new_energy_tech", "New Energy Technology", "新能源技术", "能源革命"),
    # Helper 帮助者 (3)
    ("Helper", "healthcare", "Healthcare", "医疗健康", "健康需求爆发"),
    ("Helper", "education_growth", "Education & Growth", "教育与成长", "教育升级"),
    ("Helper", "family_social_support", "Family & Social Support", "家庭与社会服务", "情感支持"),
    # Operator 操作者 (3)
    ("Operator", "ecommerce_platform_ops", "E-commerce & Platform Operations", "电商与平台运营", "数字经济"),
    ("Operator", "business_automation_ops", "Business Automation Operations", "商业自动化运营", "AI运营"),
    ("Operator", "logistics_system_ops", "Logistics & System Operations", "物流与系统运营", "智能物流"),
]

# 关键词 → track_id 映射（用于将现有职业分配到赛道）
TRACK_KEYWORDS = {
    "digital_content_creation": ["内容", "短视频", "播客", "新媒体", "社交媒体", "ip内容", "短剧", "叙事", "跨媒介"],
    "visual_design_branding": ["ui", "ux", "品牌", "广告", "创意", "视觉", "设计", "人格", "hci", "界面"],
    "digital_art_entertainment": ["动画", "游戏", "插画", "艺术", "元宇宙", "全息", "沉浸", "戏剧", "珠宝", "材料艺术", "场景", "原画", "气味", "触觉"],
    "educational_content_design": ["教育", "课程", "学习", "培训"],
    "ai_engineering": ["ai", "智能体", "agent", "机器学习", "自动化系统", "算法", "模型", "算力", "xai", "多智能体"],
    "software_engineering": ["软件", "全栈", "后端", "前端", "devops", "边缘计算", "并行计算", "协议"],
    "data_science": ["数据", "知识图谱", "生物信息", "数据分析"],
    "cyber_security": ["安全", "隐私", "合规", "漏洞", "渗透", "deepfake", "风控", "审计", "反洗钱", "guardrail"],
    "advanced_tech_rd": ["量子", "自动驾驶", "医疗ai", "合成生物", "脑机", "星际", "极地", "深海", "基础模型"],
    "product_management": ["产品经理", "产品管理", "平台产品", "内部协作"],
    "business_operations": ["运营", "数字化转型", "智慧园区", "合规审查", "办公协同", "esg", "成本优化", "排程", "ip管理", "供应链"],
    "strategy_consulting": ["战略", "咨询", "od", "知识资产", "合同", "风险对冲"],
    "project_management": ["项目", "敏捷", "pmo", "调度", "培训资源"],
    "entrepreneurship_leadership": ["创业", "ceo", "coo", "合伙人", "dao"],
    "business_dev_sales": ["商务", "销售", "大客户", "拓展"],
    "marketing_branding": ["品牌", "营销", "传播", "kol", "pr", "内容营销", "众筹", "说服力", "价值观营销", "推荐"],
    "investment_capital": ["投资", "孵化", "资本"],
    "scientific_research": ["研究员", "科学家", "量子", "神经", "合成生物", "气候", "材料", "物理", "化学", "数学", "生物打印"],
    "social_policy_research": ["政策", "社会", "经济", "伦理", "哲学", "历史", "考古", "社会学"],
    "user_behavioral_research": ["用户", "行为", "决策", "遗传"],
    "intelligent_manufacturing": ["智能制造", "工业5", "机器人", "自动化", "3d打印", "精密制造", "协作机器人"],
    "engineering_design": ["结构工程", "工业设计", "机械", "复合材料"],
    "architecture_urban": ["建筑", "城市", "孪生", "管网", "智慧城市", "绿色建筑"],
    "new_energy_tech": ["能源", "氢能", "电网", "储能", "分布式能源"],
    "healthcare": ["医疗", "心理", "康复", "健康", "老龄化", "临终", "冥想", "成瘾"],
    "education_growth": ["教育", "课程", "学习", "教练", "成长", "潜力"],
    "family_social_support": ["家庭", "社工", "社区", "养老", "孤独", "跨代际", "非营利", "融合"],
    "ecommerce_platform_ops": ["电商", "平台", "用户运营", "社区运营"],
    "business_automation_ops": ["自动化", "rpa", "流程", "saas"],
    "logistics_system_ops": ["物流", "仓储", "冷链", "供应链", "无人机", "采矿", "循环经济"],
}

def get_track_for_career(cid, name_zh, name_en, family):
    """根据职业 id/name 匹配到 30 赛道之一"""
    family_map = {
        "creator": "Creator", "solver": "Solver", "organizer": "Organizer",
        "influencer": "Influencer", "explorer": "Explorer", "guardian": "Solver",  # 安全/合规类归入 Solver-Cyber Security
        "helper": "Helper", "operator": "Operator", "builder": "Builder"
    }
    spec_family = family_map.get(family, "Creator")
    text = (cid + " " + name_zh + " " + name_en).lower()
    best = None
    best_score = 0
    for track_id, keywords in TRACK_KEYWORDS.items():
        track_family = next((f for f, tid, *_ in TRACKS_30 if tid == track_id), None)
        if track_family != spec_family:
            continue
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            best = track_id
    if best:
        return next((t for t in TRACKS_30 if t[1] == best), None)
    # 默认：按 family 选该 family 下第一个 track
    for t in TRACKS_30:
        if t[0] == spec_family:
            return t
    return TRACKS_30[0]
