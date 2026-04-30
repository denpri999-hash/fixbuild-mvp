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
  return value.replace(/\D/g, '')
}

function getIncomingText(body: any) {
  return (
    body?.messageData?.textMessageData?.textMessage ||
    body?.messageData?.extendedTextMessageData?.text ||
    body?.messageData?.fileMessageData?.caption ||
    body?.messageData?.imageMessageData?.caption ||
    body?.messageData?.documentMessageData?.caption ||
    ''
  ).trim()
}

function detectColor(text: string): 'green' | 'yellow' | 'red' {
  const t = text.toLowerCase()

  if (
    t.includes('срыв') ||
    t.includes('просрочка') ||
    t.includes('не успели') ||
    t.includes('не сделали') ||
    t.includes('сломался') ||
    t.includes('авария')
  ) {
    return 'red'
  }

  if (
    t.includes('нет материала') ||
    t.includes('задержка') ||
    t.includes('ждем') ||
    t.includes('ждём') ||
    t.includes('риск') ||
    t.includes('почти') ||
    t.includes('частично')
  ) {
    return 'yellow'
  }

  return 'green'
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const supabase = getSupabase()

    if (body?.typeWebhook && body.typeWebhook !== 'incomingMessageReceived') {
      return NextResponse.json({
        ok: true,
        skipped: true,
        typeWebhook: body.typeWebhook,
      })
    }

    const incomingText = getIncomingText(body)

    const rawSenderPhone =
      body?.senderData?.sender ||
      body?.senderData?.chatId ||
      body?.sender ||
      body?.chatId ||
      ''

    const senderPhone = normalizePhone(rawSenderPhone)

    const senderName =
      body?.senderData?.senderName ||
      body?.senderData?.chatName ||
      body?.senderName ||
      'Неизвестный отправитель'

    const color = detectColor(incomingText)

    const payload = {
      title: incomingText || 'Новое сообщение WhatsApp',
      planned_date: new Date().toISOString().slice(0, 10),
      color_indicator: color,
      ai_summary: 'WhatsApp сообщение принято напрямую. Требуется назначить объект/компанию.',
      project_name: 'Входящие WhatsApp',
      sender_name: senderName,
      sender_phone: senderPhone || null,
      status: 'active',
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select()
      .single()

    console.log('DIRECT TASK INSERT RESULT:', { data, error, payload })

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          stage: 'direct_tasks_insert',
          error: error.message,
          details: error,
          payload,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      ok: true,
      saved: true,
      direct: true,
      inserted: data,
    })
  } catch (e: any) {
    console.error('WHATSAPP ROUTE FATAL ERROR:', e)

    return NextResponse.json(
      { ok: false, error: e?.message || 'route failed' },
      { status: 200 }
    )
  }
}