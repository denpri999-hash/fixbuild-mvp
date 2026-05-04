import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase env vars')
  }

  return createClient(url, key)
}

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ''
  let value = String(raw).trim()
  if (value.includes('@')) value = value.split('@')[0]
  let digits = value.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  }
  return digits
}

/**
 * Исходящее сообщение WhatsApp через Green API.
 * URL: https://api.green-api.com/waInstance{idInstance}/sendMessage/{apiTokenInstance}
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const companyId = body?.companyId as string | undefined
    const phone = body?.phone as string | undefined
    const message = body?.message as string | undefined

    if (!companyId || !phone || !message) {
      return NextResponse.json({ ok: false, error: 'companyId, phone и message обязательны' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data: inst, error: instError } = await supabase
      .from('whatsapp_instances')
      .select('id_instance')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (instError) {
      console.error('WHATSAPP SEND instance lookup:', instError)
      return NextResponse.json({ ok: false, error: 'ошибка поиска инстанса' }, { status: 500 })
    }

    const idInstance = inst?.id_instance
    if (!idInstance) {
      return NextResponse.json({ ok: false, error: 'нет активного WhatsApp-инстанса для компании' }, { status: 503 })
    }

    const apiToken = process.env.GREEN_API_TOKEN || process.env.GREEN_API_INSTANCE_TOKEN
    if (!apiToken) {
      return NextResponse.json(
        { ok: false, error: 'не задан GREEN_API_TOKEN (или GREEN_API_INSTANCE_TOKEN) на сервере' },
        { status: 503 },
      )
    }

    const digits = normalizePhone(phone)
    if (digits.length < 10) {
      return NextResponse.json({ ok: false, error: 'некорректный телефон' }, { status: 400 })
    }

    const chatId = `${digits}@c.us`
    const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    })

    const text = await res.text()
    if (!res.ok) {
      console.error('WHATSAPP SEND failed:', res.status, text)
      return NextResponse.json({ ok: false, error: text || res.statusText }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    console.error('WHATSAPP SEND exception:', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
