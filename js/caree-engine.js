console.log("✅ career-engine.js loaded");

/*
TalentAI Career Matching Engine
负责：
1 读取用户能力
2 匹配职业库
3 生成生态池推荐
*/

function calculateCareerScore(userScores, career){

    let score = 0;
    let abilityScore = 0;

    const required = career.requiredAbilities || {};
    const bonus = career.bonusAbilities || {};

    // ─────────────
    // 1 能力匹配（T+P 向量画像：如果职业没有 track_id，仍然使用旧算法）
    // ─────────────

    if (career.track_id && typeof computeT_VectorMatch === "function" && typeof computeP_VectorMatch === "function") {
        // 兼容：从全局 Tracks DB 中读画像；如果失败则回退旧算法
        (async () => {
            try {
                const tracksDB = await loadTracksDB();
                const track = tracksDB[career.track_id];
                if (track && (track.required_T || track.required_P)) {
                    const userT = userScores; // userScores 中已有 T1_language 等，computeT_VectorMatch 内部会做 normalize
                    const userP = userScores.pScores || {}; // 如果有 P 结构，可传入；否则为空对象
                    const T_match = computeT_VectorMatch(userT, track.required_T || {});
                    const P_match = computeP_VectorMatch(userP, track.required_P || {});
                    abilityScore = 0.7 * T_match + 0.3 * P_match;
                    console.log('[AbilityScore]', {
                      career: career.name,
                      track_id: career.track_id || '无track（旧算法）',
                      T_match: T_match?.toFixed(1),
                      P_match: P_match?.toFixed(1),
                      AbilityScore: abilityScore?.toFixed(1)
                    });
                    return;
                }
            } catch (e) {
                console.warn('[TalentAI] AbilityScore vector match fallback:', e);
            }
        })();
    }

    // 如果未能使用向量画像（无 track_id 或加载失败），保持旧算法
    if (!abilityScore) {
        let legacyAbilityScore = 0;
        let abilityCount = 0;

        Object.keys(required).forEach(dim => {

            const need = Number(required[dim]) || 0;
            const user = userScores[dim]?.displayScore || 0;

            if(need <= 0) return;

            const diff = Math.abs(user - need);

            let match = 10 - diff;

            if(match < 0) match = 0;

            legacyAbilityScore += match * 10;

            abilityCount++;

        });

        if(abilityCount > 0){

            legacyAbilityScore = legacyAbilityScore / abilityCount;

        }

        abilityScore = legacyAbilityScore;
    }

    // ─────────────
    // 2 天赋加成
    // ─────────────

    let bonusScore = 0;

    Object.keys(bonus).forEach(dim => {

        const bonusWeight = bonus[dim] || 0;

        const user = userScores[dim]?.displayScore || 0;

        if(user >= 7){

            bonusScore += bonusWeight * 20;

        }

    });

    // ─────────────
    // 3 AI时代权重
    // ─────────────

    const aiImpact = career.aiImpact || {};

    const newbie = aiImpact.newbieAdvantage || 50;

    const aiMultiplier = 1 + (newbie / 200);

    // ─────────────
    // 4 综合评分
    // ─────────────

    score = (abilityScore + bonusScore) * aiMultiplier;

    return Math.round(score);

}


/*
匹配所有职业
*/

function matchAllCareers(userScores, careersDatabase){

    const careers = careersDatabase?.careers || careersDatabase;

    const results = [];

    Object.values(careers).forEach(career => {

        const score = calculateCareerScore(userScores, career);

        results.push({

            ...career,

            matchScore: score

        });

    });

    results.sort((a,b)=> b.matchScore - a.matchScore);

    return results;

}


/*
生成生态池
*/

function generateEcosystemPools(careerResults){

    const pools = {};

    careerResults.forEach(career=>{

        const family = career.family || "other";

        if(!pools[family]){

            pools[family] = [];

        }

        pools[family].push(career);

    });

    Object.keys(pools).forEach(key=>{

        pools[key] = pools[key]

            .sort((a,b)=> b.matchScore - a.matchScore)

            .slice(0,5);

    });

    return pools;

}


/*
生成四路径
*/

function generateFourPaths(careerResults){

    const sorted = [...careerResults].sort((a,b)=> b.matchScore - a.matchScore);

    return {

        primary: sorted[0] || null,

        stable: sorted[1] || null,

        aiLeveraged: sorted.find(c => c.aiImpact?.aiUpgradeType === "ai_native") || sorted[2],

        entrepreneurial: sorted.find(c => c.family === "creator" || c.family === "influencer") || sorted[3]

    };

}


/*
最终职业生态结果
*/

function generateCareerEcosystem(userScores, careersDatabase){

    const careerResults = matchAllCareers(userScores, careersDatabase);

    const ecosystemPools = generateEcosystemPools(careerResults);

    const fourPaths = generateFourPaths(careerResults);

    return {

        allCareers: careerResults,

        ecosystemPools,

        fourPaths

    };

}
