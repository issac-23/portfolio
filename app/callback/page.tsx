'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CallbackContent() {
  const params = useSearchParams()
  const code = params.get('code')
  const error = params.get('error')
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [refreshToken, setRefreshToken] = useState('')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (error) { setStatus('error'); setErrMsg(error); return }
    if (!code) { setStatus('error'); setErrMsg('No code in URL'); return }

    fetch('/api/spotify/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: 'http://localhost:3000/callback' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token)
          setStatus('done')
        } else {
          setStatus('error')
          setErrMsg(data.error ?? 'No refresh token returned')
        }
      })
      .catch((e) => { setStatus('error'); setErrMsg(e.message) })
  }, [code, error])

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: '100vh', background: '#0C0A09', color: '#EDE8E3',
      fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1.25rem',
      maxWidth: '600px', margin: '0 auto', textAlign: 'center',
    },
    heading: { color: '#C8956C', fontSize: '1.25rem', fontWeight: 500 },
    body: { color: '#9A8F85', fontSize: '0.875rem', lineHeight: 1.6 },
    box: {
      background: '#161310', border: '1px solid #2A2520', borderRadius: '8px',
      padding: '1rem', fontSize: '0.8rem', color: '#EDE8E3',
      wordBreak: 'break-all', width: '100%', textAlign: 'left',
    },
    step: { color: '#EDE8E3', fontSize: '0.875rem', lineHeight: 1.8, textAlign: 'left', width: '100%' },
  }

  if (status === 'loading') return (
    <div style={s.page}><p style={s.body}>Exchanging code with Spotify...</p></div>
  )

  if (status === 'error') return (
    <div style={s.page}>
      <p style={{ ...s.heading, color: '#e07070' }}>Something went wrong</p>
      <p style={s.body}>{errMsg}</p>
      <p style={s.body}>Make sure your Spotify app has <code style={{ color: '#C8956C' }}>http://localhost:3000/callback</code> as a redirect URI and try again.</p>
    </div>
  )

  return (
    <div style={s.page}>
      <p style={s.heading}>✓ Got your refresh token!</p>
      <p style={s.body}>Copy this value:</p>
      <pre style={s.box}>{refreshToken}</pre>
      <div style={s.step}>
        <p>Open <code style={{ color: '#C8956C' }}>.env.local</code> in your project folder and paste it as:</p>
        <pre style={{ ...s.box, marginTop: '0.5rem' }}>{`SPOTIFY_REFRESH_TOKEN=${refreshToken}`}</pre>
      </div>
      <p style={s.body}>Then restart your dev server — you&apos;re done.</p>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0C0A09' }} />}>
      <CallbackContent />
    </Suspense>
  )
}
