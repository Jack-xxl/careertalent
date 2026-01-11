// utils/score.ts
'use client'

export type LikertAnswerMap = Record<string, number> // id -> 0..3

// 把每个维度的均值转 0-100（四级量表，满分 3）
export const to100 = (v: number, max = 3) => Math.round((v / max) * 100)

// 通用：按 dim 聚合
export function aggregateByDim(
  items: { id: string; dim: string }[],
  ans: LikertAnswerMap
) {
  const sum: Record<string, number> = {}
  const cnt: Record<string, number> = {}
  items.forEach(it => {
    const s = ans[it.id]
    if (typeof s !== 'number') return
    sum[it.dim] = (sum[it.dim] ?? 0) + s
    cnt[it.dim] = (cnt[it.dim] ?? 0) + 1
  })
  const out: Record<string, number> = {}
  Object.keys(sum).forEach(k => {
    out[k] = to100(sum[k] / (cnt[k] || 1))
  })
  return out
}

// Big5：同样用 dim=O/C/E/A/N
export const scoreBig5 = aggregateByDim

// 九型：按 type 聚合（1..9；其余忽略）
export function scoreEnneagram(
  items: { id: string; type: number }[],
  ans: LikertAnswerMap
) {
  const sum: Record<number, number> = {}
  const cnt: Record<number, number> = {}
  items.forEach(it => {
    if (!it.type) return
    const s = ans[it.id]
    if (typeof s !== 'number') return
    sum[it.type] = (sum[it.type] ?? 0) + s
    cnt[it.type] = (cnt[it.type] ?? 0) + 1
  })
  const out: Record<string, number> = {}
  Object.keys(sum).forEach(k => {
    const t = Number(k)
    out[k] = to100(sum[t] / (cnt[t] || 1))
  })
  return out // '1'..'9' -> 0..100
}

// MBTI：四对极
export function scoreMBTI(
  items: { id: string; dim: 'EI' | 'SN' | 'TF' | 'JP'; pole: 'E'|'I'|'S'|'N'|'T'|'F'|'J'|'P' }[],
  ans: LikertAnswerMap
) {
  const sides: Record<string, { a: string; b: string; aSum: number; bSum: number }> = {
    EI: { a: 'E', b: 'I', aSum: 0, bSum: 0 },
    SN: { a: 'S', b: 'N', aSum: 0, bSum: 0 },
    TF: { a: 'T', b: 'F', aSum: 0, bSum: 0 },
    JP: { a: 'J', b: 'P', aSum: 0, bSum: 0 }
  }
  items.forEach(it => {
    const s = ans[it.id]
    if (typeof s !== 'number') return
    const pair = sides[it.dim]
    if (!pair) return
    if (it.pole === pair.a) pair.aSum += s
    else pair.bSum += s
  })
  const pick = (p: typeof sides['EI']) => (p.aSum >= p.bSum ? p.a : p.b)
  const code = (pick(sides.EI) + pick(sides.SN) + pick(sides.TF) + pick(sides.JP)) as string
  return { code, raw: sides }
}
