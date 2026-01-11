'use client'
export default function PayPage() {
  return (
    <div style={{maxWidth:720, margin:'32px auto', padding:'0 16px'}}>
      <h2>付款升级</h2>
      <p>这里放二维码或跳转链接。支付成功后会自动开通。</p >

      <button
        onClick={() => {
          localStorage.setItem('talentai_pro', '1');
          location.href = '/result?lang=zh&pro=1';
        }}
        style={{padding:'10px 14px', borderRadius:8, background:'#22c55e', color:'#fff', border:'none', cursor:'pointer'}}
      >
        （调试）模拟已付费并返回结果页
      </button>
    </div>
  )
}