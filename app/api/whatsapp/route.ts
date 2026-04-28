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
  'сделали',
  'сделано',
  'сделана',
  'сделаны',
  'закончили',
  'закончено',
  'закончена',
  'закончены',
  'завершили',
  'завершено',
  'завершена',
  'завершены',
  'залили',
  'залито',
  'залита',
  'залиты',
  'готово',
  'готова',
  'готовы',
  'выполнили',
  'выполнено',
  'выполнена',
  'выполнены',
  'закрыли',
  'закрыто',
  'закрыта',
  'закрыты',
  'смонтировали',
  'смонтировано',
  'смонтирована',
  'смонтированы',
  'установили',
  'установлено',
  'установлена',
  'установлены',
  'подключили',
  'подключено',
  'подключена',
  'подключены',
  'сдали',
  'приняли',
  'доделали',
  'устранили',
  'устранено',
  'устранена',
  'устранены',
  'все готово',
  'всё готово',
]

const RED_PHRASES = [
  'не успели',
  'срыв',
  'сорвали',
  'просрочка',
  'не закончили',
  'не завершили',
  'остановили',
  'остановка',
  'встали',
  'простой',
  'не вышли',
  'нет людей',
  'нет рабочих',
  'не привезли',
  'не залили',
  'не сделали',
  'не смонтировали',
  'не установили',
  'не подключили',
  'не выполнили',
  'не готово',
  'не готова',
  'не готовы',
  'полный срыв',
  'работы остановлены',
  'срок сорван',
  'сроки сорваны',
  'сломался',
  'сломалась',
  'сломались',
  'поломка',
  'авария',
  'не работает',
  'не работает насос',
  'насос сломался',
]

const YELLOW_PHRASES = [
  'частично',
  'почти',
  'почти готово',
  'почти готова',
  'почти готовы',
  'почти закончили',
  'почти сделали',
  'немного осталось',
  'осталось немного',
  'осталось чуть',
  'осталось доделать',
  'еще осталось',
  'ещё осталось',
  'не до конца',
  'не полностью',
  'в процессе',
  'доделываем',
  'доделать',
  'на 90',
  'на 80',
  'на 70',
  'ждем',
  'ждём',
  'ожидаем',
  'задержка',
  'перенос',
  'есть риск',
  'риск',
  'небольшая задержка',
  'нет материала',
  'не пришел материал',
  'не пришёл материал',
  'не поступил материал',
  'материал не пришел',
  'материал не пришёл',
]

const STAGE_RULES: { stage: string; parts: string[] }[] = [
  { stage: 'фундамент', parts: ['фундамент', 'сваи', 'ростверк', 'котлован', 'подбетон', 'подбетонка'] },
  { stage: 'монолит', parts: ['монолит', 'армир', 'опалуб', 'перекрыт', 'ригел', 'колонн', 'заливк'] },
  { stage: 'кровля', parts: ['кровл', 'крыша', 'стропил', 'мембран', 'черепиц', 'профлист'] },
  { stage: 'инженерка', parts: ['электрик', 'кабел', 'сантех', 'канализ', 'водопровод', 'водоснаб', 'отоплен', 'вентиляц', 'щит', 'розет', 'труб'] },
  { stage: 'отделка', parts: ['штукатур', 'стяжк', 'плитк', 'шпаклев', 'покраск', 'потол', 'обои', 'ламинат', 'гипсокартон'] },
  { stage: 'фасад', parts: ['фасад', 'утепл', 'облицовк', 'мокрый фасад'] },
  { stage: 'благоустройство', parts: ['отмост', 'отливк', 'отливке', 'отливку', 'благоуст', 'брусчат', 'тротуар', 'дорожк', 'бордюр', 'отсыпк', 'забор', 'ворот'] },
]

const MATERIAL_RULES: { material: string; parts: string[] }[] = [
  { material: 'бетон/арматура', parts: ['бетон', 'арматур', 'фундамент'] },
  { material: 'бетон', parts: ['бетон'] },
  { material: 'арматура', parts: ['арматур'] },
  { material: 'кирпич/блок', parts: ['кирпич', 'блок', 'газоблок', 'пеноблок'] },
  { material: 'кабель', parts: ['кабел'] },
  { material: 'трубы', parts: ['труб', 'труба'] },
  { material: 'утеплитель', parts: ['утепл', 'минвата', 'пеноплекс', 'пенопласт'] },
  { material: 'окна', parts: ['окн'] },
  { material: 'двери', parts: ['двер'] },
  { material: 'плитка', parts: ['плитк', 'керамогранит'] },
  { material: 'кровельный материал', parts: ['мембран', 'черепиц', 'профлист'] },
  { material: 'краска/сухие смеси', parts: ['краск', 'шпаклев', 'штукатур', 'цемент', 'смесь'] },
]

const REASON_RULES: { reason: string; parts: string[] }[] = [
  { reason: 'люди', parts: ['нет людей', 'нет рабочих', 'людей нет', 'рабочих нет', 'не вышли', 'бригада', 'рабочих', 'прораб', 'мастер', 'людей не хватает', 'люди'] },
  { reason: 'материал', parts: ['нет материала', 'не пришел материал', 'не пришёл материал', 'не поступил материал', 'материал', 'закончился материал'] },
  { reason: 'техника', parts: ['кран', 'экскаватор', 'насос', 'техника', 'поломка', 'сломал', 'сломался', 'манипулятор', 'автовышка'] },
  { reason: 'погода', parts: ['дожд', 'снег', 'мороз', 'ветер', 'погод', 'ливень'] },
  { reason: 'сроки/организация', parts: ['не успели', 'срыв', 'просрочка', 'задержка', 'перенос', 'сорвали', 'срок'] },
  { reason: 'проект/согласование', parts: ['чертеж', 'чертёж', 'согласован', 'проект', 'узел', 'изменени', 'согласование'] },
]

const PROJECT_ALIASES: Record<string, string[]> = {
  'ЖК Орда': ['жк орда', 'орда', 'zhk orda', 'orda'],
  'Объект 1': ['объект 1', 'об 1', 'об1', 'obj1', 'object 1', 'первый объект'],
  'Объект 2': ['объект 2', 'об 2', 'об2', 'obj2', 'object 2', 'второй объект'],
  'Объект 3': ['объект 3', 'об 3', 'об3', 'obj3', 'object 3', 'третий объект'],
}

function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:()[\]{}"«»'`/\\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function toStorageSafeSlug(value: string) {
  const latin = (value || 'project')
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/[а-я]/gi, '')
    .replace(/[^a-z0-9-_ ]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return latin || 'project'
}

function toStorageSafeFileName(value: string) {
  return (value || `photo-${Date.now()}.jpg`)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
}

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase))
}

function hasWordPart(text: string, parts: string[]) {
  return parts.some((part) => text.includes(part))
}

function hasAllGroups(text: string, groups: string[][]) {
  return groups.every((group) => hasWordPart(text, group))
}

function sanitizeTitle(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^[ ?]+$/.test(trimmed)) return '[Некорректный текст]'
  return trimmed
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

function detectProjectName(text: string) {
  const t = normalizeForMatch(text)

  for (const [projectName, aliases] of Object.entries(PROJECT_ALIASES)) {
    for (const alias of aliases) {
      if (t.includes(alias)) return projectName
    }
  }

  return 'Объект 1'
}

function stripProjectMentions(text: string) {
  let cleaned = normalizeForMatch(text)

  for (const aliases of Object.values(PROJECT_ALIASES)) {
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ')
    }
  }

  return cleaned.replace(/\s+/g, ' ').trim()
}

function detectStage(text: string) {
  const t = normalizeForMatch(text)

  if (t.includes('отмост') || t.includes('отливк') || t.includes('отливке') || t.includes('отливку')) {
    return 'благоустройство'
  }

  for (const rule of STAGE_RULES) {
    if (rule.parts.some((part) => t.includes(part))) return rule.stage
  }

  return 'прочее'
}

function detectMaterial(text: string) {
  const t = normalizeForMatch(text)

  if (t.includes('отмост') || t.includes('отливк')) return 'бетон'
  if (t.includes('фундамент') && t.includes('бетон')) return 'бетон/арматура'

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

function detectYellowByMeaning(text: string) {
  const t = normalizeForMatch(text)

  const partialGroups = [
    ['почти', 'частич', 'не до конца', 'неполност', 'в процессе', 'додел'],
    ['остал', 'немного', 'чуть', 'чуть чуть', 'чуток', 'небольш'],
  ]

  const almostDoneGroups = [
    ['почти', 'частич', 'додел'],
    ['закончил', 'заверш', 'сделал', 'выполнил', 'залил', 'смонтировал', 'установил'],
  ]

  const waitGroups = [['ждем', 'ждём', 'ожидаем', 'задерж', 'перенос', 'риск']]

  const materialGroups = [
    ['нет', 'не приш', 'не поступ', 'законч'],
    ['материал', 'бетон', 'арматур', 'кабель', 'труба', 'плитка', 'окна', 'двери'],
  ]

  if (hasAllGroups(t, partialGroups)) return true
  if (hasAllGroups(t, almostDoneGroups)) return true
  if (hasAllGroups(t, waitGroups)) return true
  if (hasAllGroups(t, materialGroups)) return true

  return false
}

function detectState(text: string) {
  const raw = normalizeForMatch(text)

  const done = includesAny(raw, DONE_PHRASES)
  const red = includesAny(raw, RED_PHRASES)
  const yellow = includesAny(raw, YELLOW_PHRASES) || detectYellowByMeaning(raw)

  const stage = detectStage(raw)
  const material = detectMaterial(raw)
  const reason = detectReason(raw)

  const hasShortIssueContext =
    stage !== 'прочее' &&
    (
      reason !== 'прочее' ||
      material !== 'не указан' ||
      raw.includes('дожд') ||
      raw.includes('материал') ||
      raw.includes('люд') ||
      raw.includes('рабоч') ||
      raw.includes('техник') ||
      raw.includes('насос') ||
      raw.includes('поломк') ||
      raw.includes('сломал') ||
      raw.includes('задерж') ||
      raw.includes('риск')
    )

  const hasShortCriticalContext =
    stage !== 'прочее' &&
    (
      raw.includes('не сделали') ||
      raw.includes('не успели') ||
      raw.includes('срыв') ||
      raw.includes('просроч') ||
      raw.includes('сломал') ||
      raw.includes('сломался') ||
      raw.includes('поломка') ||
      (raw.includes('нет') && (raw.includes('люд') || raw.includes('материал') || raw.includes('бетон')))
    )

  if (red || hasShortCriticalContext) {
    return { kind: 'problem' as const, color: 'red' as const, summary: 'Срыв сроков' }
  }

  if (yellow || hasShortIssueContext) {
    return { kind: 'risk' as const, color: 'yellow' as const, summary: 'Есть риск' }
  }

  if (done) {
    return { kind: 'done' as const, color: 'green' as const, summary: 'Работы завершены' }
  }

  return { kind: 'normal' as const, color: 'green' as const, summary: 'Всё по плану' }
}

function buildProblemKey(projectName: string, stage: string, reason: string, material: string) {
  if (stage !== 'прочее') {
    if (reason !== 'прочее') return `${projectName}|${stage}|${reason}|base`
    if (material !== 'не указан' && !['бетон', 'бетон/арматура'].includes(material)) {
      return `${projectName}|${stage}|base|${material}`
    }
    return `${projectName}|${stage}|base|base`
  }

  if (reason !== 'прочее') return `${projectName}|reason|${reason}|base`
  if (material !== 'не указан') return `${projectName}|material|base|${material}`
  return `${projectName}|прочее|прочее|не указан`
}

function buildProblemTitle(stage: string, reason: string, material: string, fallbackText: string) {
  if (stage !== 'прочее') return stage
  if (reason !== 'прочее') return reason
  if (material !== 'не указан') return material
  return sanitizeTitle(fallbackText) || 'прочее'
}

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return ''

  let value = String(raw).trim()

  if (value.includes('@')) {
    value = value.split('@')[0]
  }

  let digits = value.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  }

  return digits
}

function calculateNextDaysCount(lastSeenAt: string | null, currentDaysCount: number | null): number {
  const current = Number(currentDaysCount || 1)

  if (!lastSeenAt) return current

  const now = new Date()
  const lastSeen = new Date(lastSeenAt)

  const isSameDay =
    now.getFullYear() === lastSeen.getFullYear() &&
    now.getMonth() === lastSeen.getMonth() &&
    now.getDate() === lastSeen.getDate()

  return isSameDay ? current : current + 1
}

async function findEmployeeByPhone(supabase: any, phone: string) {
  const normalized = normalizePhone(phone)

  if (!normalized) return null

  const { data, error } = await supabase
    .from('employees')
    .select('id, name, phone, normalized_phone, company_id')
    .or(`normalized_phone.eq.${normalized},phone.eq.${normalized}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('FIND EMPLOYEE ERROR:', error)
    return null
  }

  return data || null
}

function getMediaInfo(body: any) {
  const type = body?.messageData?.typeMessage
  const fileData =
    body?.messageData?.fileMessageData ||
    body?.messageData?.imageMessageData ||
    body?.messageData?.documentMessageData ||
    {}

  const mimeType =
    fileData?.mimeType ||
    fileData?.typeMime ||
    body?.messageData?.mimeType ||
    'application/octet-stream'

  const fileName =
    fileData?.fileName ||
    fileData?.downloadFileName ||
    (String(mimeType).startsWith('image/') ? `photo-${Date.now()}.jpg` : `file-${Date.now()}`)

  const downloadUrl =
    fileData?.downloadUrl ||
    fileData?.downloadUrlFile ||
    fileData?.urlFile ||
    body?.messageData?.downloadUrl ||
    null

  const isImage = type === 'imageMessage' || String(mimeType).startsWith('image/')

  return {
    type,
    isImage,
    mimeType,
    fileName,
    downloadUrl,
  }
}

async function ensureProject(supabase: any, projectName: string, companyId: string) {
  const { data: exact } = await supabase
    .from('projects')
    .select('id, name, company_id')
    .eq('company_id', companyId)
    .eq('name', projectName)
    .maybeSingle()

  if (exact) return exact

  const { data: fallback } = await supabase
    .from('projects')
    .select('id, name, company_id')
    .eq('company_id', companyId)
    .limit(1)
    .maybeSingle()

  if (fallback) return fallback

  const { data: created, error } = await supabase
    .from('projects')
    .insert([{ name: projectName, company_id: companyId }])
    .select('id, name, company_id')
    .single()

  if (error) throw error
  return created
}

async function uploadPhotoIfAny(supabase: any, body: any, projectName: string) {
  const media = getMediaInfo(body)
  console.log('MEDIA INFO:', media)

  if (!media.isImage || !media.downloadUrl) {
    console.log('PHOTO SKIPPED:', {
      isImage: media.isImage,
      downloadUrl: media.downloadUrl,
      type: media.type,
      mimeType: media.mimeType,
    })
    return null
  }

  const response = await fetch(media.downloadUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  const safeProject = toStorageSafeSlug(projectName || 'project')
  const safeFileName = toStorageSafeFileName(media.fileName || `${Date.now()}.jpg`)
  const path = `tasks/${safeProject}/${Date.now()}-${safeFileName}`

  console.log('UPLOAD PATH:', path)

  const { error } = await supabase.storage
    .from('task-photos')
    .upload(path, bytes, {
      contentType: media.mimeType,
      upsert: true,
    })

  console.log('UPLOAD ERROR:', error)

  if (error) {
    throw new Error(error.message)
  }

  const { data: publicData } = supabase.storage.from('task-photos').getPublicUrl(path)
  return publicData?.publicUrl || null
}

async function addProblemHistory(
  supabase: any,
  params: {
    problemId: string
    event: string
    projectName: string
    problemTitle: string
    comment?: string | null
    companyId?: string | null
    employeeId?: string | null
    senderPhone?: string | null
  }
) {
  await supabase.from('problem_history').insert([
    {
      problem_id: params.problemId,
      event: params.event,
      project_name: params.projectName,
      problem_title: params.problemTitle,
      comment: params.comment || null,
      company_id: params.companyId || null,
      employee_id: params.employeeId || null,
      sender_phone: params.senderPhone || null,
    },
  ])
}

async function addProblemMedia(
  supabase: any,
  params: {
    taskId: string | null
    problemId: string | null
    projectId: string | null
    projectName: string
    problemTitle?: string | null
    senderName: string
    comment: string
    photoUrl: string
  }
) {
  await supabase.from('problem_media').insert([
    {
      task_id: params.taskId,
      problem_id: params.problemId,
      project_id: params.projectId,
      project_name: params.projectName,
      problem_title: params.problemTitle || null,
      sender_name: params.senderName,
      comment: params.comment || null,
      photo_url: params.photoUrl,
    },
  ])
}

export async function POST(req: NextRequest) {
  let body: any = null
  let raw = ''

  try {
    raw = await req.text()
    body = JSON.parse(raw)
  } catch (e) {
    console.error('PARSE ERROR:', e)
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 200 })
  }

  console.log('FULL BODY:', JSON.stringify(body, null, 2))
  console.log('WHATSAPP DEBUG TYPE:', body?.typeWebhook)
  console.log('WHATSAPP DEBUG MESSAGE:', body?.messageData)
  console.log('WHATSAPP DEBUG SENDER:', body?.senderData)

  if (body?.typeWebhook !== 'incomingMessageReceived') {
    return NextResponse.json({
      ok: true,
      skipped: 'not incomingMessageReceived',
      typeWebhook: body?.typeWebhook || null,
    })
  }

  try {
    const supabase = getSupabase()

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
      'Не указан'

    const incomingText = sanitizeTitle(getIncomingText(body))
    const type = body?.messageData?.typeMessage

    console.log('PARSED TEXT:', incomingText)
    console.log('TYPE MESSAGE:', type)

    const employee = await findEmployeeByPhone(supabase, senderPhone)

    console.log('EMPLOYEE LOOKUP:', {
      rawSenderPhone,
      senderPhone,
      found: Boolean(employee),
      employeeId: employee?.id || null,
      companyId: employee?.company_id || null,
    })

    if (!employee?.id || !employee?.company_id) {
      try {
        await supabase.from('unknown_whatsapp_messages').insert([
          {
            sender_phone: senderPhone || null,
            normalized_phone: senderPhone || null,
            sender_name: senderNameFromWebhook || null,
            message_text: incomingText || null,
            raw_payload: body,
          },
        ])
      } catch (unknownError) {
        console.error('UNKNOWN MESSAGE SAVE ERROR:', unknownError)
      }

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: 'unknown_employee',
        senderPhone,
      })
    }

    const employeeId = employee.id
    const companyId = employee.company_id
    const senderName = employee.name || senderNameFromWebhook

    const baseTextForProject = incomingText || ''
    const detectedProjectName = detectProjectName(baseTextForProject)
    const project = await ensureProject(supabase, detectedProjectName, companyId)
    const projectName = project?.name || detectedProjectName

    console.log('PROJECT:', {
      id: project?.id,
      name: projectName,
      companyId,
    })

    let photoUrl: string | null = null

    try {
      photoUrl = await uploadPhotoIfAny(supabase, body, projectName)
    } catch (mediaError) {
      console.error('PHOTO UPLOAD ERROR:', mediaError)
    }

    console.log('PHOTO URL RESULT:', photoUrl)

    let title = incomingText
    let detectedKind: 'done' | 'problem' | 'risk' | 'normal' = 'normal'
    let color: 'green' | 'yellow' | 'red' = 'green'
    let summary = 'Всё по плану'

    if (incomingText) {
      const parsed = detectState(incomingText)
      detectedKind = parsed.kind
      color = parsed.color
      summary = parsed.summary
    } else if (photoUrl) {
      title = `[Фото] ${projectName}`
      detectedKind = 'normal'
      color = 'green'
      summary = 'Фото получено'
    } else if (type === 'audioMessage') {
      title = '[Голосовое сообщение]'
      detectedKind = 'risk'
      color = 'yellow'
      summary = 'Ожидает расшифровки'
    } else {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `unsupported type ${type}`,
      })
    }

    const cleanedText = stripProjectMentions(title)
    const stage = detectStage(cleanedText || title)
    const material = detectMaterial(cleanedText || title)
    const reason = detectReason(cleanedText || title)
    const responsiblePerson = senderName
    const problemTitle = buildProblemTitle(stage, reason, material, cleanedText || title)
    const problemKey = buildProblemKey(projectName, stage, reason, material)
    const groupingKey = `${slugify(projectName)}_${slugify(problemTitle)}`

    const taskPayload = {
      title,
      planned_date: new Date().toISOString().slice(0, 10),
      color_indicator: color,
      ai_summary: summary,
      project_name: projectName,
      project_id: project.id,
      company_id: companyId,
      employee_id: employeeId,
      sender_name: senderName,
      sender_phone: senderPhone,
      photo_url: photoUrl,
      status: 'active',
    }

    console.log('INSERTING TASK:', taskPayload)

    const { data: insertedTask, error: taskError } = await supabase
      .from('tasks')
      .insert([taskPayload])
      .select()
      .single()

    if (taskError) {
      console.error('TASK INSERT ERROR:', taskError)
      return NextResponse.json({ ok: false, error: taskError.message }, { status: 200 })
    }

    const taskId = insertedTask?.id || null

    const { data: projectProblems, error: projectProblemsError } = await supabase
      .from('problems')
      .select('*')
      .eq('company_id', companyId)
      .eq('project_id', project.id)
      .order('last_seen_at', { ascending: false })

    if (projectProblemsError) {
      console.error('PROJECT PROBLEMS ERROR:', projectProblemsError)
      return NextResponse.json({ ok: true, inserted: insertedTask })
    }

    const existingActiveProblem = (projectProblems || []).find(
      (p: any) => p.is_active === true && p.problem_key === problemKey
    )

    const existingClosedProblem = (projectProblems || []).find(
      (p: any) => p.is_active === false && p.problem_key === problemKey
    )

    const activeStageProblem = (projectProblems || []).find(
      (p: any) => p.is_active === true && p.stage === stage && stage !== 'прочее'
    )

    let relatedProblemId: string | null = null
    let relatedProblemTitle: string | null = null

    if (detectedKind === 'done') {
      const candidate = existingActiveProblem || activeStageProblem

      if (candidate) {
        relatedProblemId = candidate.id
        relatedProblemTitle = candidate.title

        await supabase
          .from('problems')
          .update({
            status: 'closed',
            is_active: false,
            last_seen_at: new Date().toISOString(),
            stage,
            material,
            reason,
            responsible_person: responsiblePerson,
            project_id: project.id,
            project_name: projectName,
            company_id: companyId,
            employee_id: employeeId,
            sender_phone: senderPhone,
            photo_url: photoUrl || candidate.photo_url || null,
          })
          .eq('id', candidate.id)

        await addProblemHistory(supabase, {
          problemId: candidate.id,
          event: 'Проблема закрыта по факту выполнения',
          projectName,
          problemTitle: candidate.title,
          comment: title,
          companyId,
          employeeId,
          senderPhone,
        })
      }

      if (photoUrl) {
        await addProblemMedia(supabase, {
          taskId,
          problemId: relatedProblemId,
          projectId: project.id,
          projectName,
          problemTitle: relatedProblemTitle,
          senderName,
          comment: title,
          photoUrl,
        })
      }

      return NextResponse.json({ ok: true, inserted: insertedTask })
    }

    if ((detectedKind === 'problem' || detectedKind === 'risk') && existingActiveProblem) {
      const nextSeverity =
        detectedKind === 'problem'
          ? 'red'
          : existingActiveProblem.severity === 'red'
            ? 'red'
            : 'yellow'

      const newDaysCount = calculateNextDaysCount(
        existingActiveProblem.last_seen_at || null,
        existingActiveProblem.days_count || 1
      )

      await supabase
        .from('problems')
        .update({
          last_seen_at: new Date().toISOString(),
          days_count: newDaysCount,
          severity: nextSeverity,
          status: 'open',
          is_active: true,
          stage,
          material,
          reason,
          responsible_person: responsiblePerson,
          project_id: project.id,
          project_name: projectName,
          company_id: companyId,
          employee_id: employeeId,
          sender_phone: senderPhone,
          photo_url: photoUrl || existingActiveProblem.photo_url || null,
        })
        .eq('id', existingActiveProblem.id)

      relatedProblemId = existingActiveProblem.id
      relatedProblemTitle = existingActiveProblem.title

      await addProblemHistory(supabase, {
        problemId: existingActiveProblem.id,
        event: 'Проблема обновлена',
        projectName,
        problemTitle: existingActiveProblem.title,
        comment: title,
        companyId,
        employeeId,
        senderPhone,
      })

      if (photoUrl) {
        await addProblemMedia(supabase, {
          taskId,
          problemId: relatedProblemId,
          projectId: project.id,
          projectName,
          problemTitle: relatedProblemTitle,
          senderName,
          comment: title,
          photoUrl,
        })
      }

      return NextResponse.json({ ok: true, inserted: insertedTask })
    }

    if ((detectedKind === 'problem' || detectedKind === 'risk') && existingClosedProblem) {
      const nextSeverity = detectedKind === 'problem' ? 'red' : 'yellow'

      await supabase
        .from('problems')
        .update({
          status: 'open',
          is_active: true,
          severity: nextSeverity,
          last_seen_at: new Date().toISOString(),
          days_count: 1,
          stage,
          material,
          reason,
          responsible_person: responsiblePerson,
          project_id: project.id,
          project_name: projectName,
          company_id: companyId,
          employee_id: employeeId,
          sender_phone: senderPhone,
          photo_url: photoUrl || existingClosedProblem.photo_url || null,
        })
        .eq('id', existingClosedProblem.id)

      relatedProblemId = existingClosedProblem.id
      relatedProblemTitle = existingClosedProblem.title

      await addProblemHistory(supabase, {
        problemId: existingClosedProblem.id,
        event: 'Проблема переоткрыта',
        projectName,
        problemTitle: existingClosedProblem.title,
        comment: title,
        companyId,
        employeeId,
        senderPhone,
      })

      if (photoUrl) {
        await addProblemMedia(supabase, {
          taskId,
          problemId: relatedProblemId,
          projectId: project.id,
          projectName,
          problemTitle: relatedProblemTitle,
          senderName,
          comment: title,
          photoUrl,
        })
      }

      return NextResponse.json({ ok: true, inserted: insertedTask })
    }

    if (detectedKind === 'problem' || detectedKind === 'risk') {
      const nextSeverity = detectedKind === 'problem' ? 'red' : 'yellow'

      const { data: newProblem, error: newProblemError } = await supabase
        .from('problems')
        .insert([
          {
            project_id: project.id,
            project_name: projectName,
            company_id: companyId,
            employee_id: employeeId,
            title: problemTitle,
            status: 'open',
            severity: nextSeverity,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            days_count: 1,
            is_active: true,
            stage,
            material,
            reason,
            responsible_person: responsiblePerson,
            sender_phone: senderPhone,
            photo_url: photoUrl,
            problem_key: problemKey,
            grouping_key: groupingKey,
          },
        ])
        .select()
        .single()

      if (newProblemError) {
        console.error('NEW PROBLEM ERROR:', newProblemError)
        return NextResponse.json({ ok: true, inserted: insertedTask })
      }

      relatedProblemId = newProblem.id
      relatedProblemTitle = problemTitle

      await addProblemHistory(supabase, {
        problemId: newProblem.id,
        event: 'Создана проблема',
        projectName,
        problemTitle,
        comment: title,
        companyId,
        employeeId,
        senderPhone,
      })
    }

    if (photoUrl) {
      await addProblemMedia(supabase, {
        taskId,
        problemId: relatedProblemId,
        projectId: project.id,
        projectName,
        problemTitle: relatedProblemTitle,
        senderName,
        comment: title,
        photoUrl,
      })
    }

    return NextResponse.json({ ok: true, inserted: insertedTask })
  } catch (e: any) {
    console.error('WHATSAPP ROUTE ERROR:', e)
    return NextResponse.json(
      { ok: false, error: e?.message || 'route failed' },
      { status: 200 }
    )
  }
}
