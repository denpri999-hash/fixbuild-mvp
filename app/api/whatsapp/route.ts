import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

type Color = 'green' | 'yellow' | 'red'
type Kind = 'done' | 'problem' | 'risk' | 'normal'

type ParsedState = {
  kind: Kind
  color: Color
  summary: string
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase env vars')
  }

  return createClient(url, key)
}

function normalizeForMatch(text: string) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:()[\]{}"«»'`/\\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(value: string) {
  return normalizeForMatch(value)
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
}

function sanitizeTitle(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^[ ?]+$/.test(trimmed)) return '[Некорректный текст]'
  return trimmed
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

function toStorageSafeSlug(value: string) {
  const latin = String(value || 'project')
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
  return String(value || `photo-${Date.now()}.jpg`)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
}

const DONE_PHRASES = [
  'сделали', 'сделано', 'сделана', 'сделаны',
  'закончили', 'закончено', 'закончена', 'закончены',
  'завершили', 'завершено', 'завершена', 'завершены',
  'готово', 'готова', 'готовы', 'выполнили', 'выполнено',
  'закрыли', 'закрыто', 'закрыта', 'закрыты',
  'устранили', 'устранено', 'устранена', 'устранены',
  'смонтировали', 'установили', 'подключили', 'сдали', 'приняли',
  'привезли', 'доставили', 'материал пришел', 'материал пришёл',
  'все готово', 'всё готово',
]

const RED_PHRASES = [
  'не успели', 'срыв', 'сорвали', 'просрочка', 'просрочено',
  'не закончили', 'не завершили', 'остановили', 'остановка',
  'встали', 'простой', 'не вышли', 'нет людей', 'нет рабочих',
  'не привезли', 'не залили', 'не сделали', 'не смонтировали',
  'не установили', 'не подключили', 'не выполнили', 'не готово',
  'работы остановлены', 'срок сорван', 'сроки сорваны',
  'сломался', 'сломалась', 'сломались', 'поломка', 'авария',
  'не работает', 'насос сломался',
]

const YELLOW_PHRASES = [
  'частично', 'почти', 'немного осталось', 'осталось немного',
  'осталось доделать', 'еще осталось', 'ещё осталось', 'не до конца',
  'не полностью', 'в процессе', 'доделываем', 'ждем', 'ждём',
  'ожидаем', 'задержка', 'перенос', 'есть риск', 'риск',
  'небольшая задержка', 'нет материала', 'не пришел материал',
  'не пришёл материал', 'не поступил материал', 'материал не пришел',
  'материал не пришёл', 'закончился материал',
]

const STAGE_RULES: { stage: string; parts: string[] }[] = [
  { stage: 'фундамент', parts: ['фундамент', 'сваи', 'ростверк', 'котлован', 'подбетон', 'подбетонка'] },
  { stage: 'монолит', parts: ['монолит', 'армир', 'опалуб', 'перекрыт', 'ригел', 'колонн', 'заливк'] },
  { stage: 'кровля', parts: ['кровл', 'крыша', 'стропил', 'мембран', 'черепиц', 'профлист'] },
  { stage: 'инженерка', parts: ['электрик', 'кабел', 'сантех', 'канализ', 'водопровод', 'водоснаб', 'отоплен', 'вентиляц', 'щит', 'розет', 'труб'] },
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
  { reason: 'люди', parts: ['нет людей', 'нет рабочих', 'людей нет', 'рабочих нет', 'не вышли', 'бригада', 'прораб', 'мастер', 'людей не хватает'] },
  { reason: 'материал', parts: ['нет материала', 'не пришел материал', 'не пришел', 'не пришёл материал', 'не пришёл', 'не поступил материал', 'материал', 'закончился материал'] },
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

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(normalizeForMatch(phrase)))
}

function hasAllGroups(text: string, groups: string[][]) {
  return groups.every((group) => group.some((part) => text.includes(normalizeForMatch(part))))
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
      if (t.includes(normalizeForMatch(alias))) return projectName
    }
  }

  return 'Входящие WhatsApp'
}

function stripProjectMentions(text: string) {
  let cleaned = normalizeForMatch(text)

  for (const aliases of Object.values(PROJECT_ALIASES)) {
    for (const alias of aliases) {
      const escaped = normalizeForMatch(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ')
    }
  }

  return cleaned.replace(/\s+/g, ' ').trim()
}

function detectStage(text: string) {
  const t = normalizeForMatch(text)

  if (t.includes('отмост') || t.includes('отливк')) return 'благоустройство'

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
    ['остал', 'немного', 'чуть', 'чуток', 'небольш'],
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

  return (
    hasAllGroups(t, partialGroups) ||
    hasAllGroups(t, almostDoneGroups) ||
    hasAllGroups(t, waitGroups) ||
    hasAllGroups(t, materialGroups)
  )
}

function detectState(text: string): ParsedState {
  const raw = normalizeForMatch(text)

  const done = includesAny(raw, DONE_PHRASES)
  const red = includesAny(raw, RED_PHRASES)
  const yellow = includesAny(raw, YELLOW_PHRASES) || detectYellowByMeaning(raw)

  const stage = detectStage(raw)
  const material = detectMaterial(raw)
  const reason = detectReason(raw)

  const hasShortCriticalContext =
    stage !== 'прочее' &&
    (
      raw.includes('не сделали') ||
      raw.includes('не успели') ||
      raw.includes('срыв') ||
      raw.includes('просроч') ||
      raw.includes('сломал') ||
      raw.includes('поломка') ||
      (raw.includes('нет') && (raw.includes('люд') || raw.includes('материал') || raw.includes('бетон')))
    )

  const hasShortIssueContext =
    stage !== 'прочее' &&
    (reason !== 'прочее' || material !== 'не указан' || raw.includes('материал') || raw.includes('задерж') || raw.includes('риск'))

  if (red || hasShortCriticalContext) {
    return { kind: 'problem', color: 'red', summary: 'Срыв сроков' }
  }

  if (yellow || hasShortIssueContext) {
    return { kind: 'risk', color: 'yellow', summary: 'Есть риск' }
  }

  if (done) {
    return { kind: 'done', color: 'green', summary: 'Работы завершены' }
  }

  return { kind: 'normal', color: 'green', summary: 'Всё по плану' }
}

function buildProblemKey(projectName: string, stage: string, reason: string, material: string) {
  const stable = [projectName, stage, reason, material].map((v) => slugify(v || 'base')).join('|')
  return stable || `${slugify(projectName)}|прочее|прочее|base`
}

function buildTaskKey(projectName: string, incomingText: string, stage: string, reason: string, material: string) {
  const normalizedText = normalizeForMatch(incomingText)

  if (normalizedText) {
    return `${slugify(projectName)}|text|${slugify(normalizedText)}`
  }

  return `${slugify(projectName)}|${slugify(stage)}|${slugify(reason)}|${slugify(material)}`
}

function buildProblemTitle(stage: string, reason: string, material: string, fallbackText: string) {
  if (stage !== 'прочее') return stage
  if (reason !== 'прочее') return reason
  if (material !== 'не указан') return material
  return sanitizeTitle(fallbackText) || 'прочее'
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

  return { type, isImage, mimeType, fileName, downloadUrl }
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
  const byCompanyAndName = async () => {
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

  const byNameOnly = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, company_id')
      .eq('name', projectName)
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data || null
  }

  const existing = await byCompanyAndName()
  if (existing) return existing

  const globalExisting = await byNameOnly()
  if (globalExisting) return globalExisting

  const { data: created, error } = await supabase
    .from('projects')
    .insert([{ name: projectName, company_id: companyId }])
    .select('id, name, company_id')
    .single()

  if (!error) return created

  const isDuplicate = String(error?.code) === '23505' || String(error?.message || '').includes('duplicate')
  if (isDuplicate) {
    const afterDup = (await byCompanyAndName()) || (await byNameOnly())
    if (afterDup) return afterDup
  }

  throw error
}

async function uploadPhotoIfAny(supabase: any, body: any, projectName: string) {
  const media = getMediaInfo(body)

  if (!media.isImage || !media.downloadUrl) return null

  const response = await fetch(media.downloadUrl)
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`)

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

  if (error) throw new Error(error.message)

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
  const { error } = await supabase.from('problem_history').insert([
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

  if (error) console.error('PROBLEM HISTORY ERROR:', error)
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
  const { error } = await supabase.from('problem_media').insert([
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

  if (error) console.error('PROBLEM MEDIA ERROR:', error)
}

async function safeInsertTask(supabase: any, payload: Record<string, any>) {
  const finalPayload = {
    ...payload,
    title: payload.title || 'Новое сообщение WhatsApp',
    planned_date: payload.planned_date || new Date().toISOString().slice(0, 10),
    status: payload.status || 'active',
  }

  return supabase.from('tasks').insert([finalPayload]).select().single()
}

async function closeExistingTaskIfDone(
  supabase: any,
  params: {
    projectName: string
    stage: string
    material: string
    reason: string
    incomingText: string
    senderName: string
    senderPhone: string
  }
) {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_name', params.projectName)
    .eq('status', 'active')
    .in('color_indicator', ['red', 'yellow'])
    .gte('created_at', fourteenDaysAgo)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('CLOSE LOOKUP ERROR:', error)
    return null
  }

  const stageKey = `Этап: ${params.stage}`
  const materialKey = `Материал: ${params.material}`
  const reasonKey = `Причина: ${params.reason}`

  const candidate = (candidates || []).find((task: any) => {
    const summary = String(task.ai_summary || '')
    const sameStage = params.stage !== 'прочее' && summary.includes(stageKey)
    const sameMaterial = params.material !== 'не указан' && summary.includes(materialKey)
    const sameReason = params.reason !== 'прочее' && summary.includes(reasonKey)
    return sameStage || sameMaterial || sameReason
  })

  if (!candidate) return null

  const { data: closedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'closed',
      color_indicator: 'green',
      ai_summary: `Проблема закрыта по сообщению WhatsApp: ${params.incomingText}`,
      updated_at: new Date().toISOString(),
      sender_name: params.senderName,
      sender_phone: params.senderPhone || null,
    })
    .eq('id', candidate.id)
    .select()
    .single()

  if (updateError) {
    console.error('CLOSE UPDATE ERROR:', updateError)
    return null
  }

  return closedTask
}

async function updateExistingTaskIfDuplicate(
  supabase: any,
  params: {
    projectName: string
    taskKey: string
    incomingText: string
    parsed: ParsedState
    stage: string
    material: string
    reason: string
    senderName: string
    senderPhone: string
  }
) {
  if (params.parsed.color !== 'red' && params.parsed.color !== 'yellow') return null

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: existingTask, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_name', params.projectName)
    .eq('status', 'active')
    .in('color_indicator', ['red', 'yellow'])
    .ilike('ai_summary', `%KEY:${params.taskKey}%`)
    .gte('created_at', sevenDaysAgo)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('DEDUPE LOOKUP ERROR:', error)
    return null
  }

  if (!existingTask) return null

  const nextColor: Color = existingTask.color_indicator === 'red' || params.parsed.color === 'red'
    ? 'red'
    : params.parsed.color

  const nextSummary = `${params.parsed.summary}. Объект: ${params.projectName}. Этап: ${params.stage}. Причина: ${params.reason}. Материал: ${params.material}. KEY:${params.taskKey} | Обновлено из WhatsApp`

  const { data: updatedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      updated_at: new Date().toISOString(),
      color_indicator: nextColor,
      ai_summary: nextSummary,
      sender_name: params.senderName,
      sender_phone: params.senderPhone || null,
    })
    .eq('id', existingTask.id)
    .select()
    .single()

  if (updateError) {
    console.error('DEDUPE UPDATE ERROR:', updateError)
    return null
  }

  return updatedTask
}

async function syncProblemsIfPossible(
  supabase: any,
  params: {
    companyId: string | null
    employeeId: string | null
    projectId: string | null
    projectName: string
    taskId: string | null
    title: string
    parsed: ParsedState
    stage: string
    material: string
    reason: string
    senderName: string
    senderPhone: string
    photoUrl: string | null
  }
) {
  if (!params.companyId || !params.projectId) return

  const problemTitle = buildProblemTitle(params.stage, params.reason, params.material, params.title)
  const problemKey = buildProblemKey(params.projectName, params.stage, params.reason, params.material)
  const groupingKey = `${slugify(params.projectName)}_${slugify(problemTitle)}`

  const { data: projectProblems, error } = await supabase
    .from('problems')
    .select('*')
    .eq('company_id', params.companyId)
    .eq('project_id', params.projectId)
    .order('last_seen_at', { ascending: false })

  if (error) {
    console.error('PROJECT PROBLEMS ERROR:', error)
    return
  }

  const existingActiveProblem = (projectProblems || []).find((p: any) => p.is_active === true && p.problem_key === problemKey)
  const existingClosedProblem = (projectProblems || []).find((p: any) => p.is_active === false && p.problem_key === problemKey)
  const activeStageProblem = (projectProblems || []).find((p: any) => p.is_active === true && p.stage === params.stage && params.stage !== 'прочее')

  let relatedProblemId: string | null = null
  let relatedProblemTitle: string | null = null

  if (params.parsed.kind === 'done') {
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
          stage: params.stage,
          material: params.material,
          reason: params.reason,
          responsible_person: params.senderName,
          project_id: params.projectId,
          project_name: params.projectName,
          company_id: params.companyId,
          employee_id: params.employeeId,
          sender_phone: params.senderPhone,
          photo_url: params.photoUrl || candidate.photo_url || null,
        })
        .eq('id', candidate.id)

      await addProblemHistory(supabase, {
        problemId: candidate.id,
        event: 'Проблема закрыта по факту выполнения',
        projectName: params.projectName,
        problemTitle: candidate.title,
        comment: params.title,
        companyId: params.companyId,
        employeeId: params.employeeId,
        senderPhone: params.senderPhone,
      })
    }
  }

  if ((params.parsed.kind === 'problem' || params.parsed.kind === 'risk') && existingActiveProblem) {
    const nextSeverity = params.parsed.kind === 'problem' || existingActiveProblem.severity === 'red' ? 'red' : 'yellow'

    await supabase
      .from('problems')
      .update({
        last_seen_at: new Date().toISOString(),
        days_count: Math.max(1, Number(existingActiveProblem.days_count || 1)),
        severity: nextSeverity,
        status: 'open',
        is_active: true,
        stage: params.stage,
        material: params.material,
        reason: params.reason,
        responsible_person: params.senderName,
        project_id: params.projectId,
        project_name: params.projectName,
        company_id: params.companyId,
        employee_id: params.employeeId,
        sender_phone: params.senderPhone,
        photo_url: params.photoUrl || existingActiveProblem.photo_url || null,
      })
      .eq('id', existingActiveProblem.id)

    relatedProblemId = existingActiveProblem.id
    relatedProblemTitle = existingActiveProblem.title

    await addProblemHistory(supabase, {
      problemId: existingActiveProblem.id,
      event: 'Проблема обновлена',
      projectName: params.projectName,
      problemTitle: existingActiveProblem.title,
      comment: params.title,
      companyId: params.companyId,
      employeeId: params.employeeId,
      senderPhone: params.senderPhone,
    })
  }

  if ((params.parsed.kind === 'problem' || params.parsed.kind === 'risk') && !existingActiveProblem) {
    const reopen = existingClosedProblem
    if (reopen) {
      await supabase
        .from('problems')
        .update({
          status: 'open',
          is_active: true,
          severity: params.parsed.kind === 'problem' ? 'red' : 'yellow',
          last_seen_at: new Date().toISOString(),
          days_count: 1,
          stage: params.stage,
          material: params.material,
          reason: params.reason,
          responsible_person: params.senderName,
          project_id: params.projectId,
          project_name: params.projectName,
          company_id: params.companyId,
          employee_id: params.employeeId,
          sender_phone: params.senderPhone,
          photo_url: params.photoUrl || reopen.photo_url || null,
        })
        .eq('id', reopen.id)

      relatedProblemId = reopen.id
      relatedProblemTitle = reopen.title
    } else {
      const { data: newProblem, error: newProblemError } = await supabase
        .from('problems')
        .insert([
          {
            project_id: params.projectId,
            project_name: params.projectName,
            company_id: params.companyId,
            employee_id: params.employeeId,
            title: problemTitle,
            status: 'open',
            severity: params.parsed.kind === 'problem' ? 'red' : 'yellow',
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            days_count: 1,
            is_active: true,
            stage: params.stage,
            material: params.material,
            reason: params.reason,
            responsible_person: params.senderName,
            sender_phone: params.senderPhone,
            photo_url: params.photoUrl,
            problem_key: problemKey,
            grouping_key: groupingKey,
          },
        ])
        .select()
        .single()

      if (newProblemError) {
        console.error('NEW PROBLEM ERROR:', newProblemError)
      } else {
        relatedProblemId = newProblem.id
        relatedProblemTitle = problemTitle

        await addProblemHistory(supabase, {
          problemId: newProblem.id,
          event: 'Создана проблема',
          projectName: params.projectName,
          problemTitle,
          comment: params.title,
          companyId: params.companyId,
          employeeId: params.employeeId,
          senderPhone: params.senderPhone,
        })
      }
    }
  }

  if (params.photoUrl) {
    await addProblemMedia(supabase, {
      taskId: params.taskId,
      problemId: relatedProblemId,
      projectId: params.projectId,
      projectName: params.projectName,
      problemTitle: relatedProblemTitle,
      senderName: params.senderName,
      comment: params.title,
      photoUrl: params.photoUrl,
    })
  }
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    if (body?.typeWebhook && body.typeWebhook !== 'incomingMessageReceived') {
      return NextResponse.json({ ok: true, skipped: true, typeWebhook: body.typeWebhook })
    }

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

    let title = incomingText
    let parsed: ParsedState = incomingText
      ? detectState(incomingText)
      : { kind: 'normal', color: 'green', summary: 'Сообщение получено' }

    if (!incomingText && type === 'audioMessage') {
      title = '[Голосовое сообщение]'
      parsed = { kind: 'risk', color: 'yellow', summary: 'Ожидает расшифровки' }
    }

    if (!incomingText && getMediaInfo(body).isImage) {
      title = '[Фото]'
      parsed = { kind: 'normal', color: 'green', summary: 'Фото получено' }
    }

    if (!title) {
      return NextResponse.json({ ok: true, skipped: true, reason: `unsupported type ${type || 'unknown'}` })
    }

    const cleanedText = stripProjectMentions(title)
    const detectedProjectName = detectProjectName(title)
    const stage = detectStage(cleanedText || title)
    const material = detectMaterial(cleanedText || title)
    const reason = detectReason(cleanedText || title)
    const taskKey = buildTaskKey(detectedProjectName, title, stage, reason, material)

    let whatsappInstance: any = null
    let employee: any = null
    let companyId: string | null = null
    let employeeId: string | null = null
    let senderName = senderNameFromWebhook
    let project: any = null
    let projectName = detectedProjectName
    let photoUrl: string | null = null

    try {
      whatsappInstance = await findCompanyByGreenInstance(supabase, body)
      employee = await findEmployeeByPhone(supabase, senderPhone)
      companyId = whatsappInstance?.company_id || employee?.company_id || null
      employeeId = employee?.id || null
      senderName = employee?.name || senderNameFromWebhook

      if (companyId && detectedProjectName !== 'Входящие WhatsApp') {
        project = await ensureProject(supabase, detectedProjectName, companyId)
        projectName = project?.name || detectedProjectName
      }

      photoUrl = await uploadPhotoIfAny(supabase, body, projectName)
    } catch (routingError) {
      console.error('ROUTING/MEDIA ERROR, CONTINUE WITH TASK:', routingError)
    }

    try {
      if (parsed.kind === 'done' || parsed.color === 'green') {
        const closedTask = await closeExistingTaskIfDone(supabase, {
          projectName,
          stage,
          material,
          reason,
          incomingText: title,
          senderName,
          senderPhone,
        })

        if (closedTask) {
          await syncProblemsIfPossible(supabase, {
            companyId,
            employeeId,
            projectId: project?.id || null,
            projectName,
            taskId: closedTask.id,
            title,
            parsed,
            stage,
            material,
            reason,
            senderName,
            senderPhone,
            photoUrl,
          })

          return NextResponse.json({ ok: true, closed: true, task: closedTask })
        }
      }

      const existingTask = await updateExistingTaskIfDuplicate(supabase, {
        projectName,
        taskKey,
        incomingText: title,
        parsed,
        stage,
        material,
        reason,
        senderName,
        senderPhone,
      })

      if (existingTask) {
        await syncProblemsIfPossible(supabase, {
          companyId,
          employeeId,
          projectId: project?.id || null,
          projectName,
          taskId: existingTask.id,
          title,
          parsed,
          stage,
          material,
          reason,
          senderName,
          senderPhone,
          photoUrl,
        })

        return NextResponse.json({ ok: true, updated: true, task: existingTask })
      }
    } catch (dedupeError) {
      console.error('DEDUPE/CLOSE ERROR, FALLBACK TO INSERT:', dedupeError)
    }

    const aiSummary = `${parsed.summary}. Объект: ${projectName}. Этап: ${stage}. Причина: ${reason}. Материал: ${material}. KEY:${taskKey}`

    const taskPayload: Record<string, any> = {
      title,
      planned_date: new Date().toISOString().slice(0, 10),
      color_indicator: parsed.color,
      ai_summary: aiSummary,
      project_name: projectName,
      sender_name: senderName,
      sender_phone: senderPhone || null,
      photo_url: photoUrl,
      status: 'active',
    }

    if (companyId) taskPayload.company_id = companyId
    if (employeeId) taskPayload.employee_id = employeeId
    if (project?.id) taskPayload.project_id = project.id

    const { data: insertedTask, error: taskError } = await safeInsertTask(supabase, taskPayload)

    if (taskError) {
      console.error('TASK INSERT ERROR:', taskError)
      return NextResponse.json(
        { ok: false, stage: 'tasks_insert', error: taskError.message, details: taskError, payload: taskPayload },
        { status: 200 }
      )
    }

    try {
      await syncProblemsIfPossible(supabase, {
        companyId,
        employeeId,
        projectId: project?.id || null,
        projectName,
        taskId: insertedTask?.id || null,
        title,
        parsed,
        stage,
        material,
        reason,
        senderName,
        senderPhone,
        photoUrl,
      })
    } catch (problemsError) {
      console.error('PROBLEMS SYNC ERROR, TASK ALREADY SAVED:', problemsError)
    }

    return NextResponse.json({ ok: true, inserted: insertedTask })
  } catch (e: any) {
    console.error('WHATSAPP ROUTE ERROR:', e)
    return NextResponse.json({ ok: false, error: e?.message || 'route failed' }, { status: 200 })
  }
}
