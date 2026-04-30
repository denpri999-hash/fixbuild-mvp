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

function sanitizeTitle(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^[ ?]+$/.test(trimmed)) return '[Некорректный текст]'
  return trimmed
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
  {
    stage: 'инженерка',
    parts: ['электрик', 'кабел', 'сантех', 'канализ', 'водопровод', 'водоснаб', 'отоплен', 'вентиляц', 'щит', 'розет', 'труб'],
  },
  { stage: 'отделка', parts: ['штукатур', 'стяжк', 'плитк', 'шпаклев', 'покраск', 'потол', 'обои', 'ламинат', 'гипсокартон'] },
  { stage: 'фасад', parts: ['фасад', 'утепл', 'облицовк', 'мокрый фасад'] },
  { stage: 'благоустройство', parts: ['отмост', 'отливк', 'отсыпк', 'благоуст', 'брусчат', 'тротуар', 'дорожк', 'бордюр', 'забор', 'ворот'] },
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
  'Объект 1': ['объект 1', 'об 1', 'об1'],
  'Объект 2': ['объект 2', 'об 2', 'об2'],
}

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase))
}

function detectProjectName(text: string) {
  const t = normalizeForMatch(text)

  for (const [projectName, aliases] of Object.entries(PROJECT_ALIASES)) {
    for (const alias of aliases) {
      if (t.includes(normalizeForMatch(alias))) {
        return projectName
      }
    }
  }

  return 'Входящие WhatsApp'
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

function detectState(text: string) {
  const raw = normalizeForMatch(text)

  const done = includesAny(raw, DONE_PHRASES)
  const red = includesAny(raw, RED_PHRASES)
  const yellow = includesAny(raw, YELLOW_PHRASES)

  if (red) {
    return { kind: 'problem' as const, color: 'red' as const, summary: 'Срыв сроков' }
  }

  if (yellow) {
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

async function findCompanyByGreenInstance(supabase: any, body: any) {
  const idInstance =
    body?.idInstance ||
    body?.instanceData?.idInstance ||
    body?.instanceData?.idinstance ||
    body?.instanceData?.id_instance ||
    null

  if (!idInstance) return null

  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select('company_id, id_instance, phone, is_active')
    .eq('id_instance', String(idInstance))
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('FIND WHATSAPP INSTANCE ERROR:', error)
    return null
  }

  return data || null
}

async function ensureProject(supabase: any, projectName: string, companyId: string) {
  const isDuplicateKeyError = (err: any) => {
    const code = err?.code || err?.error_code || err?.statusCode
    return String(code) === '23505' || String(err?.message || '').includes('23505')
  }

  const selectByNameAndCompany = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, company_id')
      .eq('company_id', companyId)
      .eq('name', projectName)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data || null
  }

  const existing = await selectByNameAndCompany()
  if (existing) return existing

  const { data: created, error } = await supabase
    .from('projects')
    .insert([{ name: projectName, company_id: companyId }])
    .select('id, name, company_id')
    .single()

  if (!error) return created

  if (isDuplicateKeyError(error)) {
    const afterDup = await selectByNameAndCompany()
    if (afterDup) return afterDup
    return { id: null, name: projectName, company_id: companyId }
  }

  throw error
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

async function uploadPhotoIfAny(supabase: any, body: any, projectName: string) {
  const media = getMediaInfo(body)

  if (!media.isImage || !media.downloadUrl) {
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

  const { error } = await supabase.storage
    .from('task-photos')
    .upload(path, bytes, {
      contentType: media.mimeType,
      upsert: true,
    })

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

async function safeInsertTask(supabase: any, payload: any) {
  const normalizedPayload = {
    ...payload,
    title: sanitizeTitle(payload?.title || '') || 'Новое сообщение WhatsApp',
    planned_date: payload?.planned_date || new Date().toISOString().slice(0, 10),
    status: payload?.status || 'active',
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert([normalizedPayload])
    .select()
    .single()

  return { data, error, payload: normalizedPayload }
}

async function findRecentActiveProblemTasks(
  supabase: any,
  params: { projectName: string; days: number }
) {
  const since = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('tasks')
    .select('id, created_at, updated_at, status, project_name, color_indicator, ai_summary, stage, deviation_reason, material')
    .eq('project_name', params.projectName)
    .eq('status', 'active')
    .in('color_indicator', ['red', 'yellow'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50)

  return { data: data || [], error }
}

function taskMatchesProblem(task: any, stage: string, reason: string, material: string) {
  const tStage = String(task?.stage || '').trim()
  const tReason = String(task?.deviation_reason || '').trim()
  const tMaterial = String(task?.material || '').trim()

  if (tStage || tReason || tMaterial) {
    return tStage === stage && tReason === reason && tMaterial === material
  }

  const summary = String(task?.ai_summary || '')
  return (
    summary.includes(`Этап: ${stage}`) &&
    summary.includes(`Причина: ${reason}`) &&
    summary.includes(`Материал: ${material}`)
  )
}

function taskMatchesClose(task: any, stage: string) {
  const tStage = String(task?.stage || '').trim()
  if (tStage) return tStage === stage
  return String(task?.ai_summary || '').includes(`Этап: ${stage}`)
}

function mergeProblemColor(existing: string | null | undefined, incoming: string) {
  if (existing === 'red') return 'red'
  if (incoming === 'red') return 'red'
  if (existing === 'yellow' || incoming === 'yellow') return 'yellow'
  return incoming || existing || 'yellow'
}

function isClosingMessage(incomingText: string, parsedColor: string) {
  if (parsedColor === 'green') return true
  const t = normalizeForMatch(incomingText || '')
  return (
    t.includes('сделали') ||
    t.includes('готово') ||
    t.includes('закрыли') ||
    t.includes('устранили') ||
    t.includes('завершили')
  )
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

    const incomingText = sanitizeTitle(getIncomingText(body))

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

    const type = body?.messageData?.typeMessage

    const parsed = incomingText
      ? detectState(incomingText)
      : { kind: 'normal' as const, color: 'yellow' as const, summary: 'Сообщение получено' }

    const stage = detectStage(incomingText)
    const material = detectMaterial(incomingText)
    const reason = detectReason(incomingText)
    const detectedProjectName = detectProjectName(incomingText)

    const whatsappInstance = await findCompanyByGreenInstance(supabase, body)
    const employee = await findEmployeeByPhone(supabase, senderPhone)

    const companyId = whatsappInstance?.company_id || employee?.company_id || null
    const employeeId = employee?.id || null
    const senderName = employee?.name || senderNameFromWebhook

    // PILOT MODE: do not create company/project. Always write into tasks, with dedup/close safety.
    const projectName = detectedProjectName || 'Входящие WhatsApp'
    const problemKey = `${projectName}|${stage}|${reason}|${material}`

    const basePayload: any = {
      title: incomingText || 'Новое сообщение WhatsApp',
      planned_date: new Date().toISOString().slice(0, 10),
      color_indicator: parsed.color,
      ai_summary: `${parsed.summary}. Объект: ${projectName}. Этап: ${stage}. Причина: ${reason}. Материал: ${material}.`,
      project_name: projectName,
      stage,
      deviation_reason: reason,
      material,
      sender_name: senderName,
      sender_phone: senderPhone || null,
      status: 'active',
    }

    // 2) Close problem: if green or message indicates completion, close last active red/yellow task by project+stage (14 days)
    if (isClosingMessage(incomingText, parsed.color)) {
      try {
        const { data: candidates, error: candidatesError } = await findRecentActiveProblemTasks(supabase, {
          projectName,
          days: 14,
        })

        if (candidatesError) {
          console.error('CLOSE SELECT ERROR:', candidatesError)
        } else {
          const toClose = (candidates || []).find((t: any) => taskMatchesClose(t, stage))

          if (toClose?.id) {
            const { data: closedTask, error: closeError } = await supabase
              .from('tasks')
              .update({
                status: 'closed',
                color_indicator: 'green',
                ai_summary: `Проблема закрыта по сообщению WhatsApp: ${incomingText || ''}`,
                updated_at: new Date().toISOString(),
              })
              .eq('id', toClose.id)
              .select()
              .single()

            if (!closeError) {
              return NextResponse.json({ ok: true, closed: true, problemKey, inserted: closedTask })
            }

            console.error('CLOSE UPDATE ERROR:', closeError)
          }
        }
      } catch (closeBlockError) {
        console.error('CLOSE BLOCK ERROR:', closeBlockError)
        // fall through to normal insert
      }
    }

    // 1) Anti-duplicates for red/yellow: if similar active task exists (7 days) -> update it
    if (parsed.color === 'red' || parsed.color === 'yellow') {
      try {
        const { data: candidates, error: candidatesError } = await findRecentActiveProblemTasks(supabase, {
          projectName,
          days: 7,
        })

        if (candidatesError) {
          console.error('DEDUP SELECT ERROR:', candidatesError)
        } else {
          const match = (candidates || []).find((t: any) => taskMatchesProblem(t, stage, reason, material))

          if (match?.id) {
            const nextColor = mergeProblemColor(match.color_indicator, parsed.color)
            const nextSummary = `${basePayload.ai_summary} | Обновлено из WhatsApp`

            const { data: updatedTask, error: updateError } = await supabase
              .from('tasks')
              .update({
                updated_at: new Date().toISOString(),
                color_indicator: nextColor,
                ai_summary: nextSummary,
                sender_name: senderName,
                sender_phone: senderPhone || null,
              })
              .eq('id', match.id)
              .select()
              .single()

            if (!updateError) {
              return NextResponse.json({ ok: true, updated: true, problemKey, inserted: updatedTask })
            }

            console.error('DEDUP UPDATE ERROR:', updateError)
          }
        }
      } catch (dedupBlockError) {
        console.error('DEDUP BLOCK ERROR:', dedupBlockError)
        // fall through to normal insert
      }
    }

    // Default: insert a new task (fallback-safe)
    const { data, error, payload } = await safeInsertTask(supabase, basePayload)

    console.log('WHATSAPP TASK INSERT RESULT (pilot):', { data, error, payload, problemKey })

    if (error) {
      return NextResponse.json(
        { ok: false, stage: 'tasks_insert_pilot', error: error.message, details: error, payload, problemKey },
        { status: 200 }
      )
    }

    return NextResponse.json({ ok: true, saved: true, inserted: data, problemKey })

    // Expanded logic block: must not drop webhook on error.
    try {
      const project = await ensureProject(supabase, detectedProjectName, companyId)
      const projectName = project?.name || detectedProjectName

      let photoUrl: string | null = null
      try {
        photoUrl = await uploadPhotoIfAny(supabase, body, projectName)
      } catch (mediaError) {
        console.error('PHOTO UPLOAD ERROR:', mediaError)
      }

      // Title shaping: keep original text; if empty but photo exists, mark it.
      let title = incomingText
      if (!title && photoUrl) title = `[Фото] ${projectName}`
      if (!title && type === 'audioMessage') title = '[Голосовое сообщение]'

      const taskPayload: any = {
        title: title || 'Новое сообщение WhatsApp',
        color_indicator: parsed.color,
        ai_summary: parsed.summary,
        project_name: projectName,
        stage,
        deviation_reason: reason,
        company_id: companyId,
        employee_id: employeeId,
        sender_name: senderName,
        sender_phone: senderPhone || null,
        photo_url: photoUrl,
        status: 'active',
      }

      if (project?.id) {
        taskPayload.project_id = project.id
      }

      const { data: insertedTask, error: taskError, payload: normalizedPayload } = await safeInsertTask(
        supabase,
        taskPayload
      )

      if (taskError) {
        console.error('TASK INSERT ERROR (expanded):', taskError)
        // Fallback unassigned insert to guarantee persistence
        const { data: fallbackTask, error: fallbackError } = await safeInsertTask(supabase, {
          title: title || incomingText || 'Новое сообщение WhatsApp',
          color_indicator: parsed.color,
          ai_summary: `${parsed.summary}. Объект: ${detectedProjectName}. Этап: ${stage}. Причина: ${reason}. Материал: ${material}.`,
          project_name: detectedProjectName || 'Входящие WhatsApp',
          stage,
          deviation_reason: reason,
          sender_name: senderName,
          sender_phone: senderPhone || null,
          status: 'active',
        })

        return NextResponse.json({
          ok: true,
          saved: true,
          fallback: true,
          reason: 'expanded_task_insert_failed',
          inserted: fallbackTask || null,
          insertError: taskError,
          fallbackError: fallbackError || null,
        })
      }

      const taskId = insertedTask?.id || null
      const projectId = project?.id || null

      // Problems logic only when we have a project id (linked tasks).
      if (projectId && (parsed.kind === 'problem' || parsed.kind === 'risk' || parsed.kind === 'done')) {
        const problemTitle = buildProblemTitle(stage, reason, material, title || incomingText || '')
        const problemKey = buildProblemKey(projectName, stage, reason, material)
        const groupingKey = `${slugify(projectName)}_${slugify(problemTitle)}`

        const { data: activeProblem } = await supabase
          .from('problems')
          .select('*')
          .eq('company_id', companyId)
          .eq('project_id', projectId)
          .eq('problem_key', problemKey)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        // done -> close active if exists
        if (parsed.kind === 'done') {
          if (activeProblem?.id) {
            await supabase
              .from('problems')
              .update({
                status: 'closed',
                is_active: false,
                last_seen_at: new Date().toISOString(),
                stage,
                material,
                reason,
                responsible_person: senderName,
                project_id: projectId,
                project_name: projectName,
                company_id: companyId,
                employee_id: employeeId,
                sender_phone: senderPhone || null,
                photo_url: photoUrl || activeProblem.photo_url || null,
              })
              .eq('id', activeProblem.id)

            await addProblemHistory(supabase, {
              problemId: activeProblem.id,
              event: 'Проблема закрыта по факту выполнения',
              projectName,
              problemTitle: activeProblem.title,
              comment: title || incomingText || null,
              companyId,
              employeeId,
              senderPhone: senderPhone || null,
            })
          }
        } else {
          const severity = parsed.kind === 'problem' ? 'red' : 'yellow'

          if (activeProblem?.id) {
            const nextDaysCount = Number(activeProblem.days_count || 1) + 1

            await supabase
              .from('problems')
              .update({
                last_seen_at: new Date().toISOString(),
                days_count: nextDaysCount,
                severity: activeProblem.severity === 'red' ? 'red' : severity,
                status: 'open',
                is_active: true,
                stage,
                material,
                reason,
                responsible_person: senderName,
                project_id: projectId,
                project_name: projectName,
                company_id: companyId,
                employee_id: employeeId,
                sender_phone: senderPhone || null,
                photo_url: photoUrl || activeProblem.photo_url || null,
              })
              .eq('id', activeProblem.id)

            await addProblemHistory(supabase, {
              problemId: activeProblem.id,
              event: 'Проблема обновлена',
              projectName,
              problemTitle: activeProblem.title,
              comment: title || incomingText || null,
              companyId,
              employeeId,
              senderPhone: senderPhone || null,
            })

            if (photoUrl) {
              await addProblemMedia(supabase, {
                taskId,
                problemId: activeProblem.id,
                projectId,
                projectName,
                problemTitle: activeProblem.title,
                senderName,
                comment: title || '',
                photoUrl: photoUrl!,
              })
            }
          } else {
            const { data: newProblem, error: newProblemError } = await supabase
              .from('problems')
              .insert([
                {
                  project_id: projectId,
                  project_name: projectName,
                  company_id: companyId,
                  employee_id: employeeId,
                  title: problemTitle,
                  status: 'open',
                  severity,
                  first_seen_at: new Date().toISOString(),
                  last_seen_at: new Date().toISOString(),
                  days_count: 1,
                  is_active: true,
                  stage,
                  material,
                  reason,
                  responsible_person: senderName,
                  sender_phone: senderPhone || null,
                  photo_url: photoUrl,
                  problem_key: problemKey,
                  grouping_key: groupingKey,
                },
              ])
              .select()
              .single()

            if (!newProblemError && newProblem?.id) {
              await addProblemHistory(supabase, {
                problemId: newProblem.id,
                event: 'Создана проблема',
                projectName,
                problemTitle,
                comment: title || incomingText || null,
                companyId,
                employeeId,
                senderPhone: senderPhone || null,
              })

              if (photoUrl) {
                await addProblemMedia(supabase, {
                  taskId,
                  problemId: newProblem.id,
                  projectId,
                  projectName,
                  problemTitle,
                  senderName,
                  comment: title || '',
                  photoUrl: photoUrl!,
                })
              }
            } else if (newProblemError) {
              console.error('NEW PROBLEM ERROR:', newProblemError)
            }
          }
        }
      }

      return NextResponse.json({
        ok: true,
        saved: true,
        inserted: insertedTask,
        expanded: true,
        payload: normalizedPayload,
      })
    } catch (expandedError: any) {
      console.error('FULL LOGIC ERROR:', expandedError)

      const message = expandedError?.message || 'unknown'
      const { data: fallbackTask, error: fallbackError, payload } = await safeInsertTask(supabase, {
        title: incomingText || 'Новое сообщение WhatsApp',
        color_indicator: parsed?.color || 'yellow',
        ai_summary: `Fallback: сообщение сохранено. Ошибка расширенной логики: ${message}`,
        project_name: detectedProjectName || 'Входящие WhatsApp',
        stage,
        deviation_reason: reason,
        sender_name: senderName,
        sender_phone: senderPhone || null,
        status: 'active',
      })

      return NextResponse.json({
        ok: true,
        fallback: true,
        inserted: fallbackTask || null,
        fallbackError: fallbackError || null,
        payload,
      })
    }
  } catch (e: any) {
    console.error('WHATSAPP ROUTE ERROR:', e)

    return NextResponse.json(
      { ok: false, error: e?.message || 'route failed' },
      { status: 200 }
    )
  }
}