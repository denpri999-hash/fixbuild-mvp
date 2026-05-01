'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

  const canSubmit = useMemo(() => Boolean(email.trim()) && Boolean(password), [email, password])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    try {
      setSubmitting(true)
      setErrorText('')

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorText(error.message)
        return
      }

      router.push('/')
    } catch (e: any) {
      setErrorText(e?.message || 'Ошибка входа')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <h1 style={title}>Войти</h1>
        <p style={sub}>FixBuild Dashboard</p>

        <form onSubmit={onSubmit} style={form}>
          <label style={label}>
            Email
            <input
              style={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>

          <label style={label}>
            Password
            <input
              style={input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {errorText ? <div style={errorBox}>{errorText}</div> : null}

          <button style={button} type="submit" disabled={!canSubmit || submitting}>
            {submitting ? 'Входим…' : 'Войти'}
          </button>
        </form>
      </div>
    </main>
  )
}

const wrap: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f3f4f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
}

const card: React.CSSProperties = {
  width: 'min(420px, 100%)',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 18,
  boxShadow: '0 1px 10px rgba(15,23,42,.08)',
}

const title: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 900 }
const sub: React.CSSProperties = { marginTop: 8, marginBottom: 18, color: '#64748b', fontSize: 13 }
const form: React.CSSProperties = { display: 'grid', gap: 12 }
const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 800, color: '#0f172a' }
const input: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: '#fff' }
const button: React.CSSProperties = { background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 900, cursor: 'pointer' }
const errorBox: React.CSSProperties = { background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 10, border: '1px solid #fecaca', fontWeight: 800 }

