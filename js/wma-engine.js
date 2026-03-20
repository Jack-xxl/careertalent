console.log("✅ TalentAI v4.6 Engine Loaded");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 权重配置
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WEIGHTS = {
  W: 0.35,
  P: 0.25,
  M: 0.20,
  A: 0.10
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 总入口
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateWMAResult(profile, careers) {

  const careerScores = careers.map(c => {

    const score = calcCareerScore(profile, c);

    return {
      ...c,
      matchScore: score
    };

  });

  careerScores.sort((a,b)=>b.matchScore-a.matchScore);

  const ecosystemPools = buildEcosystemPools(careerScores);

  const paths = generateFourPaths(ecosystemPools);

  return {
    ecoPosition: ecosystemPools[0],
    careerMatches: paths
  };
}

window.generateWMAResult = generateWMAResult;


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 职业评分
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcCareerScore(profile, career){

  const W = calcLayerScore(profile.W, career.W_fit);
  const P = calcLayerScore(profile.P, career.P_fit);
  const M = calcLayerScore(profile.M, career.M_fit);
  const A = calcLayerScore(profile.A, career.A_fit);

  let score =
      W * WEIGHTS.W +
      P * WEIGHTS.P +
      M * WEIGHTS.M +
      A * WEIGHTS.A;

  // T层 Bonus
  const tBonus = calcTalentBonus(profile.T, career.T_core);

  score += tBonus;

  return Math.round(score);
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 层评分
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcLayerScore(userLayer, jobLayer){

  if(!jobLayer) return 60;

  let sum = 0;
  let count = 0;

  Object.keys(jobLayer).forEach(k=>{

    const user = userLayer?.[k] || 50;
    const target = jobLayer[k];

    const diff = Math.abs(user-target);

    const score = Math.max(0,100-diff*2);

    sum+=score;
    count++;

  });

  return count? sum/count:60;

}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// T层天赋 Bonus
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcTalentBonus(T, core){

  if(!core) return 0;

  let bonus = 0;

  core.forEach(dim=>{

    const s = T?.[dim] || 0;

    if(s>=85){
      bonus+=3;
    }

  });

  return bonus;

}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 生态池
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildEcosystemPools(careers){

  const pools = {};

  careers.forEach(c=>{

    const eco = c.ecosystem || "other";

    if(!pools[eco]){

      pools[eco]={
        ecosystem:eco,
        careers:[],
        score:0
      };

    }

    pools[eco].careers.push(c);

  });

  const result = Object.values(pools).map(p=>{

    const avg =
      p.careers.reduce((a,b)=>a+b.matchScore,0)/p.careers.length;

    return {
      ...p,
      score:Math.round(avg)
    };

  });

  result.sort((a,b)=>b.score-a.score);

  return result;

}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 四路径
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateFourPaths(pools){

  const main = pools[0];

  const stable = [...pools].sort((a,b)=>b.score-a.score)[1];

  const ai = [...pools].sort((a,b)=>{

    const aiScoreA = avgAI(a.careers);
    const aiScoreB = avgAI(b.careers);

    return aiScoreB-aiScoreA;

  })[0];

  const venture = pools.find(p=>p.ecosystem==="creator") || pools[0];

  return {

    main: buildPath(main),
    stable: buildPath(stable),
    aiLeverage: buildPath(ai),
    venture: buildPath(venture)

  };

}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 构建路径
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPath(pool){

  if(!pool) return {_isMissing:true};

  const best = pool.careers[0];

  return {

    name: best.name,
    description: best.description,
    ecoPosition: pool.ecosystem,
    matchScore: best.matchScore,
    aiImpact: best.aiImpact,
    strategicStabilityIndex: best.stability || 70

  };

}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI评分
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function avgAI(careers){

  const arr = careers
      .map(c=>c.aiImpact?.growth || 50);

  return arr.reduce((a,b)=>a+b,0)/arr.length;

}
