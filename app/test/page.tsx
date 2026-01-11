'use client'
import { Suspense } from 'react'
import qs from '@/data/questions.json'
import zh from '@/frontend/i18n/zh.json'
import en from '@/frontend/i18n/en.json'
import {useSearchParams} from 'next/navigation'
import {useState} from 'react'
type Q = {id:number; stem:{zh:string,en:string}; type:string; dimension:string}

function TestContent(){
  const sp=useSearchParams()
  const lang=(sp.get('lang') as 'zh'|'en') || (localStorage.getItem('talentai_lang') as 'zh'|'en'|null) || 'zh'
  const t= lang==='zh' ? zh : en
  const [step,setStep]=useState(0)
  const [ans,setAns]=useState<number[]>(Array((qs as Q[]).length).fill(0))

  const submit=()=>{
    localStorage.setItem('talentai_ans', JSON.stringify(ans))
    localStorage.setItem('talentai_lang', lang)
    location.href='/interests?lang='+lang
  }
  const q= (qs as Q[])[step]
  const percent= Math.round((step+1)/(qs as Q[]).length*100)
  const choose=(v:number)=>{ const a=[...ans]; a[step]=v; setAns(a) }
  return (
    <div>
      <h2>{t.miTitle}</h2>
      <div style={{height:8, background:'#eee', borderRadius:6, margin:'8px 0 16px'}}>
        <div style={{width:percent+'%', height:8, background:'#333', borderRadius:6}}/>
      </div>
      <p style={{fontWeight:600}}>Q{q.id}. {q.stem[lang]}</p>
      <div style={{display:'flex',gap:8,margin:'12px 0'}}>
        <button onClick={()=>choose(1)} style={{padding:'8px 12px', background: ans[step]===1?'#333':'#eee', color: ans[step]===1?'#fff':'#000'}}>是 / Yes</button>
        <button onClick={()=>choose(0)} style={{padding:'8px 12px', background: ans[step]===0?'#333':'#eee', color: ans[step]===0?'#fff':'#000'}}>否 / No</button>
      </div>
      <div style={{marginTop:12}}>
        <button disabled={step===0} onClick={()=>setStep(s=>s-1)}>{t.prev}</button>
        <button style={{marginLeft:8}} onClick={()=> step<(qs as Q[]).length-1 ? setStep(s=>s+1) : submit()}>{ step<(qs as Q[]).length-1 ? t.next : t.submit }</button>
      </div>
    </div>
  )
}

export default function Test(){
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TestContent />
    </Suspense>
  )
}
