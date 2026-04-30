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

const DONE_PHRASES = [
  'сделали', 'сделано', 'готово', 'готова', 'готовы',
  'закончили', 'завершили', 'выполнено', 'закрыли',
  'устранили', 'смонтировали', 'установили',
]

const RED_PHRASES = [
  'срыв', 'просрочка', 'не успели', 'не сделали',
  'не закончили', 'остановка', 'простой',
  'нет людей', 'нет рабочих', 'авария', 'сломался',
  'не работает',
]

const YELLOW_PHRASES = [
  'нет материала', 'материал не пришел', 'материал не пришёл',
  'задержка', 'ждем', 'ждём', 'ожидаем',
  'риск', 'частично', 'почти', 'не до конца',
]

const STAGE_RULES = [
  { stage: 'фундамент', parts: ['фундамент', 'сваи', 'ростверк', 'котлован'] },
  { stage: 'монолит', parts: ['монолит', 'армир', 'опалуб', 'перекрыт', 'заливк'] },
  { stage: 'кровля', parts: ['кровл', 'крыша', 'стропил', 'профлист'] },
  { stage: 'инженерка', parts: ['электрик', 'кабел', 'сантех', 'отоплен', 'вентиляц', 'труб'] },
  { stage: 'отделка', parts: ['штукатур', 'стяжк', 'плитк', 'шпаклев', 'покраск', 'потол'] },
  { stage: 'фасад', parts: ['фасад', 'утепл', 'облицовк'] },
  { stage: 'благоустройство', parts: ['отмост', 'благоуст', 'брусчат', 'тротуар', 'бордюр'] },
]

const MATERIAL_RULES = [
  { material: 'бетон', parts: ['бетон'] },
  { material: 'арматура', parts: ['арматур'] },
  { material: 'кирпич/блок', parts: ['кирпич', 'блок', 'газоблок'] },
  { material: 'кабель', parts: ['кабел'] },
  { material: 'трубы', parts: ['труб'] },
  { material: 'плитка', parts: ['плитк'] },
  { material: 'кровельный материал', parts: ['мембран', 'черепиц', 'профлист'] },
]

const REASON_RULES = [
  { reason: 'люди', parts: ['нет людей', 'нет рабочих', 'не вышли', 'бригада'] },
  { reason: 'материал', parts: ['нет материала', 'материал', 'не пришел', 'не пришёл'] },
  { reason: 'техника', parts: ['кран', 'экскаватор', 'насос', 'техника', 'сломался'] },
  { reason: 'погода', parts: ['дожд', 'снег', 'мороз', 'ветер'] },
  { reason: 'сроки/организация', parts: ['срыв', 'просрочка', 'задержка', 'перенос', 'срок'] },
  { reason: 'проект/согласование', parts: ['чертеж', 'чертёж', 'проект', 'согласование'] },
]

const PROJECT_ALIASES: Record<string, string[]> = {
  'ЖК Орда': ['жк орда', 'орда', 'zhk orda', 'orda'],
  'Объект 1': ['объект 1', 'об 1', 'об1', 'obj1', 'object 1', 'первый объект'],
  'Объект 2': ['объект 2', 'об 2', 'об2', 'obj2', 'object 2', 'второй объект'],
  'Объект 3': ['объект 3', 'об 3', 'об3', 'object 3', 'третий объект'],
}

function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:()[\]{}"«»'`/\\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase))
}

function detectStage(text: string) {
  const t = normalizeForMatch(text)
  for (const rule of STAGE_RULES) {
    if (rule.parts.some((part) => t.includes(part))) return rule.stage
  }
  return 'прочее'
}

function detectMaterial(text: string) {
  const t = normalizeForMatch(text)
  for (const rule of MATERIAL_RULES) {
    if (rule.parts.some((part) => t.includes(part))) return rule.material
  }
  return 'не указан'
}

function detectReason(text: string) {
  const t = normalizeForMatch(text)
  for (const rule of REASON_RULES) {
    if (rule.parts.some((part) => t.includes(part))) return rule.reason
  }
  return 'прочее'
}

function detectProjectName(text: string) {
  const t = normalizeForMatch(text)

  for (const [projectName, aliases] of Object.entries(PROJECT_ALIASES)) {
    for (const alias of aliases) {
      if (t.includes(normalizeForMatch(alias))) return projectName
    }
  }

  return 'Входящие WhatsApp'
}

function detectState(text: string) {
  const t = normalizeForMatch(text)

  if (includesAny(t, RED_PHRASES)) {
    return { color: 'red' as const, summary: 'Обнаружена критическая проблема' }
  }

  if (includesAny(t, YELLOW_PHRASES)) {
    return { color: 'yellow' as const, summary: 'Есть риск или требуется внимание' }
  }

  if (includesAny(t, DONE_PHRASES)) {
    return { color: 'green' as const, summary: 'Работы выполнены или идут по плану' }
  }

  return { color: 'green' as const, summary: 'Сообщение принято' }
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

    const senderNameFromWebhook =
      body?.senderData?.senderName ||
      body?.senderData?.chatName ||
      body?.senderName ||
      'Неизвестный отправитель'

    const senderName = senderNameFromWebhook

    const parsed = detectState(incomingText)
    const stage = detectStage(incomingText)
    const material = detectMaterial(incomingText)
    const reason = detectReason(incomingText)
    const projectName = detectProjectName(incomingText)

    const payload = {
      title: incomingText || 'Новое сообщение WhatsApp',
      planned_date: new Date().toISOString().slice(0, 10),
      color_indicator: parsed.color,
      ai_summary: `${parsed.summary}. Объект: ${projectName}. Этап: ${stage}. Причина: ${reason}. Материал: ${material}.`,
      project_name: projectName,
      sender_name: senderName || senderNameFromWebhook || 'Неизвестный отправитель',
      sender_phone: senderPhone || null,
      status: 'active',
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select()
      .single()

    console.log('WHATSAPP TASK INSERT RESULT:', { data, error, payload })

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          stage: 'tasks_insert',
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
      inserted: data,
    })
  } catch (e: any) {
    console.error('WHATSAPP ROUTE ERROR:', e)

    return NextResponse.json(
      { ok: false, error: e?.message || 'route failed' },
      { status: 200 }
    )
  }
}