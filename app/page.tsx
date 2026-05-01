'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCompany } from '@/lib/useCompany'

type Severity = 'green' | 'yellow' | 'red' | null

type Task = {
  id: string
  title: string
  planned_date: string | null
  color_indicator: Severity
  ai_summary: string | null
  project_name: string | null
  project_id: string | null
  sender_name: string | null
  sender_phone: string | null
  photo_url: string | null
  status: string | null
  updated_at: string | null
  company_id: string | null
}

type Problem = {
  id: string
  title: string
  status: string | null
  severity: Severity
  first_seen_at: string | null
  last_seen_at: string | null
  days_count: number | null
  is_active: boolean | null
  project_name: string | null
  project_id: string | null
  company_id: string | null
  stage: string | null
  material: string | null
  reason: string | null
  responsible_person: string | null
  sender_phone?: string | null
  photo_url: string | null
  problem_key: string | null
  grouping_key: string | null
}

type Project = {
  id: string
  name: string
  company_id: string | null
}

type ProblemHistory = {
  id: string
  problem_id: string | null
  event: string
  project_name: string | null
  problem_title: string | null
  comment: string | null
  created_at: string
}

type ProblemMedia = {
  id: string
  task_id: string | null
  problem_id: string | null
  project_id: string | null
  project_name: string | null
  problem_title: string | null
  sender_name: string | null
  comment: string | null
  photo_url: string
  created_at: string
  company_id?: string | null
}

type ProblemFilter = 'all' | 'red' | 'yellow'
type EventsFilter = 'all' | 'problems' | 'photo' | 'statuses'

const role = 'admin'

const severityOrder: Record<string, number> = {
  red: 1,
  yellow: 2,
  green: 3,
}

function isInsideDateRange(value: string | null, from: string, to: string) {
  if (!value) return true
  const day = new Date(value).toISOString().slice(0, 10)
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('ru-RU')
  } catch {
    return value
  }
}

function formatDate(value: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('ru-RU')
  } catch {
    return value
  }
}

function severityLabel(value: Severity) {
  if (value === 'red') return 'Проблема'
  if (value === 'yellow') return 'Риск'
  if (value === 'green') return 'В норме'
  return 'Не указан'
}

function taskStatusText(value: Severity) {
  if (value === 'red') return 'Просрочка'
  if (value === 'yellow') return 'Риск'
  if (value === 'green') return 'В норме'
  return '-'
}

function emptyText(filter: ProblemFilter) {
  if (filter === 'red') return 'Нет активных проблем со статусом “Проблема”'
  if (filter === 'yellow') return 'Нет активных рисков'
  return 'Нет активных проблем'
}

function normalizeNullable(value: string | null | undefined, fallback = 'Не указан') {
  return value && value.trim() ? value : fallback
}

export default function Page() {
  const router = useRouter()
  const { companyId, loading: companyLoading } = useCompany()

  const [tasks, setTasks] = useState<Task[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [history, setHistory] = useState<ProblemHistory[]>([])
  const [media, setMedia] = useState<ProblemMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [problemFilter, setProblemFilter] = useState<ProblemFilter>('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [closingId, setClosingId] = useState<string | null>(null)
  const [reopeningId, setReopeningId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [telegramSending, setTelegramSending] = useState(false)
  const [selectedProblemForHistory, setSelectedProblemForHistory] = useState<string>('all')
  const [historyModalProblem, setHistoryModalProblem] = useState<Problem | null>(null)
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null)
  const [eventsFilter, setEventsFilter] = useState<EventsFilter>('all')
  const [eventsShowAll, setEventsShowAll] = useState(false)
  const [uiToast, setUiToast] = useState<string | null>(null)
  const [issuesViewMode, setIssuesViewMode] = useState<'list' | 'by_project'>('list')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})
  const [userEmail, setUserEmail] = useState<string>('')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [telegramEnabled, setTelegramEnabled] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramSaving, setTelegramSaving] = useState(false)

  async function fetchTasks() {
    let query = supabase
      .from('tasks')
      .select('id, title, planned_date, color_indicator, ai_summary, project_name, project_id, company_id, sender_name, sender_phone, photo_url, status, updated_at')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(300)

    const { data, error } = await query
    if (error) throw error
    setTasks((data || []) as Task[])
  }

  async function fetchProblems() {
    let query = supabase
      .from('problems')
      .select('id, title, status, severity, first_seen_at, last_seen_at, days_count, is_active, project_name, project_id, company_id, stage, material, reason, responsible_person, sender_phone, photo_url, problem_key, grouping_key')
      .eq('company_id', companyId)
      .order('last_seen_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    setProblems((data || []) as Problem[])
  }

  async function fetchProjects() {
    let query = supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name', { ascending: true })

    const { data, error } = await query
    if (error) throw error
    setProjects((data || []) as Project[])
  }

  async function fetchHistory() {
    if (!companyId) return

    try {
      const { data: historyData, error } = await supabase
        .from('problem_history')
        .select('id, action, comment, created_at, problem_id, project_name, company_id')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const normalized = (historyData || []).map((row: any) => ({
        id: row.id,
        problem_id: row.problem_id ?? null,
        event: String(row.action || ''),
        project_name: row.project_name ?? null,
        problem_title: null,
        comment: row.comment ?? null,
        created_at: row.created_at,
      }))

      setHistory(normalized as ProblemHistory[])
      return
    } catch (e) {
      // Fallback for legacy schema (event/problem_title). Keeps dashboard functional if DB hasn't been migrated.
      const { data, error } = await supabase
        .from('problem_history')
        .select('id, problem_id, event, project_name, problem_title, comment, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setHistory((data || []) as ProblemHistory[])
    }
  }

  async function fetchMedia() {
    if (!companyId) return

    const { data: photoArchiveData, error: photoError } = await supabase
      .from('problem_media')
      .select('id, photo_url, problem_title, project_name, sender_name, created_at')
      .eq('company_id', companyId)
      .not('photo_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (photoError) throw photoError
    setMedia(((photoArchiveData || []) as ProblemMedia[]))
  }

  async function fetchAll() {
    try {
      setErrorText('')
      setLoading(true)
      await Promise.all([fetchTasks(), fetchProblems(), fetchProjects(), fetchHistory(), fetchMedia()])
    } catch (err: any) {
      setErrorText(err?.message || 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!companyId) return
    let active = true

    async function ensureSettings() {
      try {
        setSettingsLoading(true)

        const { data: settings, error } = await supabase
          .from('company_settings')
          .select('company_id, telegram_enabled, telegram_chat_id')
          .eq('company_id', companyId)
          .limit(1)
          .maybeSingle()

        if (!active) return

        if (error) {
          console.error('SETTINGS LOAD ERROR:', error)
          return
        }

        if (!settings) {
          const { error: insertError } = await supabase.from('company_settings').insert([
            { company_id: companyId, telegram_enabled: false, telegram_chat_id: '' },
          ])
          if (insertError) {
            console.error('SETTINGS INSERT ERROR:', insertError)
            return
          }
          setTelegramEnabled(false)
          setTelegramChatId('')
          return
        }

        setTelegramEnabled(Boolean(settings.telegram_enabled))
        setTelegramChatId(String(settings.telegram_chat_id || ''))
      } catch (e) {
        console.error('SETTINGS LOAD ERROR:', e)
      } finally {
        if (!active) return
        setSettingsLoading(false)
      }
    }

    ensureSettings()
    return () => {
      active = false
    }
  }, [companyId])

  async function saveTelegramChatId() {
    if (!companyId) return
    if (telegramSaving) return
    try {
      setTelegramSaving(true)
      const { error } = await supabase
        .from('company_settings')
        .update({ telegram_chat_id: telegramChatId })
        .eq('company_id', companyId)
      if (error) throw error
      showToast('Сохранено')
    } catch (e) {
      console.error('SETTINGS SAVE ERROR:', e)
      showToast('Ошибка сохранения')
    } finally {
      setTelegramSaving(false)
    }
  }

  async function toggleTelegramEnabled() {
    if (!companyId) return
    if (telegramSaving) return
    try {
      setTelegramSaving(true)
      const next = !telegramEnabled
      setTelegramEnabled(next)
      const { error } = await supabase
        .from('company_settings')
        .update({ telegram_enabled: next })
        .eq('company_id', companyId)
      if (error) throw error
    } catch (e) {
      console.error('SETTINGS TOGGLE ERROR:', e)
      setTelegramEnabled((v) => !v)
      showToast('Ошибка обновления')
    } finally {
      setTelegramSaving(false)
    }
  }
  useEffect(() => {
    let active = true

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser()
        if (!active) return
        setUserEmail(data?.user?.email || '')
      } catch (e) {
        console.error('Failed to load user:', e)
        if (!active) return
        setUserEmail('')
      }
    }

    loadUser()
    return () => {
      active = false
    }
  }, [])

  async function logout() {
    try {
      await supabase.auth.signOut()
    } finally {
      router.push('/login')
    }
  }
  useEffect(() => {
    if (companyId) {
      setSelectedProject('all')
      fetchAll()
    }
  }, [companyId])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('issues_view_mode')
      if (saved === 'list' || saved === 'by_project') setIssuesViewMode(saved)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem('issues_view_mode', issuesViewMode)
    } catch {
      // ignore
    }
  }, [issuesViewMode])

  const activeProblemsBase = useMemo(() => {
    return problems
      .filter((p) => p.status === 'open' && p.is_active !== false)
      .filter((p) => selectedProject === 'all' || p.project_name === selectedProject)
      .filter((p) => isInsideDateRange(p.last_seen_at, dateFrom, dateTo))
  }, [problems, selectedProject, dateFrom, dateTo])

  const stageOptions = useMemo(() => {
    const set = new Set<string>()
    activeProblemsBase.forEach((p) => set.add((p.stage || 'Без этапа').trim() || 'Без этапа'))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [activeProblemsBase])

  const closedProblems = useMemo(() => {
    return problems
      .filter((p) => p.status === 'closed' || p.is_active === false)
      .filter((p) => selectedProject === 'all' || p.project_name === selectedProject)
      .filter((p) => isInsideDateRange(p.last_seen_at, dateFrom, dateTo))
      .slice(0, 30)
  }, [problems, selectedProject, dateFrom, dateTo])

  const filteredProblems = useMemo(() => {
    const result = activeProblemsBase
      .filter((p) => stageFilter === 'all' || (p.stage || 'Без этапа') === stageFilter)
      .filter((p) => {
      if (problemFilter === 'red') return p.severity === 'red'
      if (problemFilter === 'yellow') return p.severity === 'yellow'
      return true
    })

    return [...result].sort((a, b) => {
      const bySeverity = (severityOrder[a.severity || 'green'] || 99) - (severityOrder[b.severity || 'green'] || 99)
      if (bySeverity !== 0) return bySeverity
      return Number(b.days_count || 0) - Number(a.days_count || 0)
    })
  }, [activeProblemsBase, problemFilter, stageFilter])

  const groupedIssues = useMemo(() => {
    const byProject: Record<string, Problem[]> = {}
    filteredProblems.forEach((p) => {
      const project = (p.project_name || 'Без объекта').trim() || 'Без объекта'
      byProject[project] = byProject[project] || []
      byProject[project].push(p)
    })

    const projectsList = Object.entries(byProject).map(([projectName, items]) => {
      const red = items.filter((i) => i.severity === 'red').length
      const yellow = items.filter((i) => i.severity === 'yellow').length
      const maxDuration = Math.max(...items.map((i) => Number(i.days_count || 0)), 0)

      const byStage: Record<string, Problem[]> = {}
      items.forEach((p) => {
        const stage = (p.stage || 'Без этапа').trim() || 'Без этапа'
        byStage[stage] = byStage[stage] || []
        byStage[stage].push(p)
      })

      const stages = Object.entries(byStage).map(([stageName, stageItems]) => {
        const r = stageItems.filter((i) => i.severity === 'red').length
        const y = stageItems.filter((i) => i.severity === 'yellow').length
        const max = Math.max(...stageItems.map((i) => Number(i.days_count || 0)), 0)

        const sortedTasks = [...stageItems].sort((a, b) => {
          const bySeverity = (severityOrder[a.severity || 'green'] || 99) - (severityOrder[b.severity || 'green'] || 99)
          if (bySeverity !== 0) return bySeverity
          return Number(b.days_count || 0) - Number(a.days_count || 0)
        })

        return { stageName, red: r, yellow: y, maxDuration: max, tasks: sortedTasks }
      }).sort((a, b) => b.maxDuration - a.maxDuration)

      return { projectName, red, yellow, maxDuration, stages }
    }).sort((a, b) => b.maxDuration - a.maxDuration)

    return projectsList
  }, [filteredProblems])

  useEffect(() => {
    // Stage filter behavior in "By projects" mode:
    // - hide empty projects is automatic via filteredProblems
    // - auto-expand matching stage (and its project) when filter is set
    // - reset collapse when cleared
    if (issuesViewMode !== 'by_project') return

    if (stageFilter === 'all') {
      setExpandedProjects({})
      setExpandedStages({})
      return
    }

    const nextProjects: Record<string, boolean> = {}
    const nextStages: Record<string, boolean> = {}
    groupedIssues.forEach((proj) => {
      const hasStage = proj.stages.some((s) => s.stageName === stageFilter)
      if (!hasStage) return
      nextProjects[proj.projectName] = true
      nextStages[`${proj.projectName}__${stageFilter}`] = true
    })
    setExpandedProjects(nextProjects)
    setExpandedStages(nextStages)
  }, [stageFilter, issuesViewMode, groupedIssues])

  function expandAllToStages() {
    const nextP: Record<string, boolean> = {}
    const nextS: Record<string, boolean> = {}
    groupedIssues.forEach((proj) => {
      nextP[proj.projectName] = true
      proj.stages.forEach((s) => {
        nextS[`${proj.projectName}__${s.stageName}`] = true
      })
    })
    setExpandedProjects(nextP)
    setExpandedStages(nextS)
  }

  function collapseAll() {
    setExpandedProjects({})
    setExpandedStages({})
  }

  const projectFilteredTasks = useMemo(() => {
    return tasks
      .filter((t) => selectedProject === 'all' || t.project_name === selectedProject)
      .filter((t) => isInsideDateRange(t.updated_at, dateFrom, dateTo))
  }, [tasks, selectedProject, dateFrom, dateTo])

  const recentTasks = useMemo(() => projectFilteredTasks.slice(0, 30), [projectFilteredTasks])

  const stageSummary = useMemo(() => {
    const map: Record<string, number> = {}
    activeProblemsBase.forEach((item) => {
      const key = item.stage || 'прочее'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [activeProblemsBase])

  const reasonSummary = useMemo(() => {
    const map: Record<string, number> = {}
    activeProblemsBase.forEach((item) => {
      const key = item.reason || 'прочее'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [activeProblemsBase])

  const employeeSummary = useMemo(() => {
    const map: Record<string, number> = {}
    activeProblemsBase.forEach((item) => {
      const key = item.responsible_person || 'Не указан'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [activeProblemsBase])

  const blockers = useMemo(() => {
    return activeProblemsBase
      .filter((item) => item.severity === 'red' || Number(item.days_count || 0) >= 3)
      .sort((a, b) => Number(b.days_count || 0) - Number(a.days_count || 0))
      .slice(0, 5)
  }, [activeProblemsBase])

  const visibleProjectNames = useMemo(() => new Set(projects.map((project) => project.name)), [projects])

  const filteredHistory = useMemo(() => {
    let scoped = selectedProject === 'all' ? history : history.filter((h) => h.project_name === selectedProject)
    scoped = scoped.filter((h) => h.project_name ? visibleProjectNames.has(h.project_name) : false)
    if (selectedProblemForHistory !== 'all') {
      scoped = scoped.filter((h) => h.problem_id === selectedProblemForHistory)
    }
    return scoped.filter((h) => isInsideDateRange(h.created_at, dateFrom, dateTo)).slice(0, 25)
  }, [history, selectedProject, selectedProblemForHistory, dateFrom, dateTo, companyId, visibleProjectNames])

  const modalHistory = useMemo(() => {
    if (!historyModalProblem) return []
    return history
      .filter((item) => item.problem_id === historyModalProblem.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [history, historyModalProblem])

  const filteredMedia = useMemo(() => {
    return media
      .filter((m) => (m.project_name ? visibleProjectNames.has(m.project_name) : false))
      .filter((m) => selectedProject === 'all' || m.project_name === selectedProject)
      .filter((m) => isInsideDateRange(m.created_at, dateFrom, dateTo))
      .slice(0, 20)
  }, [media, selectedProject, dateFrom, dateTo, visibleProjectNames])

  const unifiedEvents = useMemo(() => {
    const items: Array<{
      id: string
      type: EventsFilter
      title: string
      projectName: string
      at: string
      meta?: string
      issueId?: string | null
      photoUrl?: string | null
    }> = []

    // Problems: история проблем
    filteredHistory.forEach((h) => {
      items.push({
        id: `h_${h.id}`,
        type: 'problems',
        title: h.event,
        projectName: h.project_name || 'Без объекта',
        at: h.created_at,
        meta: h.problem_title || '',
        issueId: h.problem_id,
      })
    })

    // Photo: медиа
    filteredMedia.forEach((m) => {
      items.push({
        id: `m_${m.id}`,
        type: 'photo',
        title: m.problem_title || 'Фото',
        projectName: m.project_name || 'Без объекта',
        at: m.created_at,
        meta: m.comment || '',
        issueId: m.problem_id,
        photoUrl: m.photo_url,
      })
    })

    // Statuses: задачи WhatsApp
    recentTasks.forEach((t) => {
      items.push({
        id: `t_${t.id}`,
        type: 'statuses',
        title: t.title,
        projectName: t.project_name || 'Без объекта',
        at: t.updated_at || t.planned_date || new Date().toISOString(),
        meta: taskStatusText(t.color_indicator),
        photoUrl: t.photo_url,
      })
    })

    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [filteredHistory, filteredMedia, recentTasks])

  const visibleEvents = useMemo(() => {
    const filtered = unifiedEvents.filter((e) => eventsFilter === 'all' || e.type === eventsFilter)
    return eventsShowAll ? filtered : filtered.slice(0, 10)
  }, [unifiedEvents, eventsFilter, eventsShowAll])

  function scrollToActiveIssues() {
    const el = document.getElementById('active-issues')
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scrollToIssue(problemId: string | null | undefined) {
    if (!problemId) return
    scrollToActiveIssues()
    window.setTimeout(() => {
      const row = document.getElementById(`issue-${problemId}`)
      if (!row) return
      row.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedIssueId(problemId)
      window.setTimeout(() => setHighlightedIssueId((current) => (current === problemId ? null : current)), 2600)
    }, 120)
  }

  function showToast(text: string) {
    setUiToast(text)
    window.setTimeout(() => setUiToast(null), 2200)
  }

  function normalizePhoneForWaLink(value: string | null | undefined) {
    const digits = String(value || '').replace(/\D/g, '')
    if (!digits) return ''
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
    return digits
  }

  function requestUpdate(problem: Problem) {
    const phone = normalizePhoneForWaLink(problem.sender_phone)
    if (!phone) {
      console.error('requestUpdate: missing sender_phone for problem', { problemId: problem.id })
      showToast('Нет телефона для запроса обновления')
      return
    }

    const stage = problem.stage || 'этап'
    const project = problem.project_name || 'объект'
    const text = `Добрый день! Нужен статус по объекту ${project}, этап: ${stage}. Напишите, пожалуйста, актуальное обновление.`
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`

    window.open(url, '_blank', 'noopener,noreferrer')
    showToast('Открыт WhatsApp для запроса')
  }

  const reportText = useMemo(() => {
    const redCount = activeProblemsBase.filter((p) => p.severity === 'red').length
    const yellowCount = activeProblemsBase.filter((p) => p.severity === 'yellow').length
    const greenCount = projectFilteredTasks.filter((t) => t.color_indicator === 'green').length
    const attentionCount = activeProblemsBase.length

    const blockerText = blockers.length
      ? blockers
          .map(
            (p, i) =>
              `${i + 1}. ${p.project_name || 'Без объекта'} — ${p.title} — этап: ${p.stage || 'прочее'} — причина: ${p.reason || 'прочее'} — ответственный: ${p.responsible_person || 'Не указан'} — ${p.days_count || 1} дн.`
          )
          .join('\n')
      : 'Критичных блокеров нет'

    const riskText = activeProblemsBase
      .filter((p) => p.severity !== 'red')
      .slice(0, 5)
      .map((p, i) => `${i + 1}. ${p.project_name || 'Без объекта'} — ${p.title} — ${p.days_count || 1} дн.`)
      .join('\n') || 'Рисков нет'

    return `FixBuild — отчет директору\n\nОбъект: ${selectedProject === 'all' ? 'Все объекты' : selectedProject}\nПериод: ${dateFrom || 'с начала'} — ${dateTo || 'сегодня'}\nПроблем: ${redCount}\nРисков: ${yellowCount}\nВ норме: ${greenCount}\nТребует внимания: ${attentionCount}\n\nГлавные блокеры:\n${blockerText}\n\nРиски:\n${riskText}\n\nПроблемы по этапам:\n${stageSummary.map(([name, count]) => `- ${name}: ${count}`).join('\n') || '- нет'}\n\nПроблемы по причинам:\n${reasonSummary.map(([name, count]) => `- ${name}: ${count}`).join('\n') || '- нет'}\n\nЭффективность сотрудников / кто чаще фигурирует в активных проблемах:\n${employeeSummary.map(([name, count]) => `- ${name}: ${count}`).join('\n') || '- нет'}\n\nПоследние события:\n${recentTasks.slice(0, 5).map((t, i) => `${i + 1}. ${t.title} — ${t.project_name || 'Без объекта'} — ${taskStatusText(t.color_indicator)}`).join('\n') || '- нет'}`
  }, [activeProblemsBase, projectFilteredTasks, blockers, stageSummary, reasonSummary, employeeSummary, recentTasks, selectedProject, dateFrom, dateTo])

  async function copyReport() {
    await navigator.clipboard.writeText(reportText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  async function sendTelegramReport() {
    if (telegramSending) return

    try {
      setTelegramSending(true)

      const response = await fetch('/api/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: reportText,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        console.error('Telegram send error:', result)
        alert(result?.error || 'Не удалось отправить отчет в Telegram')
        return
      }

      alert('Отчет отправлен в Telegram')
    } catch (error) {
      console.error('Telegram send failed:', error)
      alert('Ошибка отправки в Telegram')
    } finally {
      setTelegramSending(false)
    }
  }

  async function closeProblem(problemId: string) {
    const current = problems.find((p) => p.id === problemId)
    if (!current) return

    try {
      setClosingId(problemId)
      const { error } = await supabase
        .from('problems')
        .update({
          status: 'closed',
          is_active: false,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', problemId)

      if (error) throw error

      await supabase.from('problem_history').insert([
        {
          problem_id: problemId,
          event: 'Проблема закрыта вручную',
          project_name: current.project_name,
          problem_title: current.title,
          comment: 'Закрыто через панель директора',
        },
      ])

      await fetchAll()
    } catch (err) {
      console.error('Ошибка закрытия проблемы:', err)
    } finally {
      setClosingId(null)
    }
  }

  async function reopenProblem(problemId: string) {
    const current = problems.find((p) => p.id === problemId)
    if (!current) return

    try {
      setReopeningId(problemId)
      const { error } = await supabase
        .from('problems')
        .update({
          status: 'open',
          is_active: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', problemId)

      if (error) throw error

      await supabase.from('problem_history').insert([
        {
          problem_id: problemId,
          event: 'Проблема переоткрыта вручную',
          project_name: current.project_name,
          problem_title: current.title,
          comment: 'Переоткрыто через панель директора',
        },
      ])

      await fetchAll()
    } catch (err) {
      console.error('Ошибка переоткрытия проблемы:', err)
    } finally {
      setReopeningId(null)
    }
  }

  const redCount = activeProblemsBase.filter((p) => p.severity === 'red').length
  const yellowCount = activeProblemsBase.filter((p) => p.severity === 'yellow').length
  const greenCount = projectFilteredTasks.filter((t) => t.color_indicator === 'green').length
  const attentionCount = activeProblemsBase.length

  if (companyLoading) {
    return <main style={pageWrap}><div style={loadingBox}>Загрузка FixBuild Dashboard...</div></main>
  }

  if (!companyId) {
    return <main style={pageWrap}><div style={loadingBox}>Компания не найдена</div></main>
  }

  if (loading) {
    return <main style={pageWrap}><div style={loadingBox}>Загрузка FixBuild Dashboard...</div></main>
  }

  return (
    <main style={pageWrap}>
      <div style={container}>
        <header style={header}>
          <div>
            <h1 style={title}>FixBuild Dashboard</h1>
            <p style={subtitle}>Панель директора: реальные проблемы, риски, этапы, причины, объекты, фотоархив и сотрудники</p>
          </div>

          <div style={filtersRow}>
            <select style={projectSelect} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="all">Все объекты</option>
              {projects.map((project) => (
                <option key={project.id} value={project.name}>{project.name}</option>
              ))}
            </select>
            <input style={dateInput} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input style={dateInput} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <button style={secondaryButton} onClick={fetchAll}>Обновить</button>
            <div style={authChip}>
              <span>{userEmail || '—'}</span>
              <button style={secondaryMiniButton} onClick={logout}>Выйти</button>
            </div>
          </div>
        </header>

        {errorText ? <div style={errorBox}>{errorText}</div> : null}

        <div style={clientModeBox}>
          Режим клиента: данные отфильтрованы по компании. company_id: {companyId}
        </div>

        {/* KPI */}
        <section style={kpiGrid}>
          <KpiCard label="Проблемы" value={redCount} color="#ef4444" onClick={scrollToActiveIssues} />
          <KpiCard label="Риски" value={yellowCount} color="#f59e0b" onClick={scrollToActiveIssues} />
          <KpiCard label="В норме" value={greenCount} color="#22c55e" onClick={scrollToActiveIssues} />
          <KpiCard label="Требует внимания" value={attentionCount} color="#f97316" onClick={scrollToActiveIssues} />
        </section>

        {/* Отчет директору / Сводка по объекту */}
        <CollapsibleSection
          title="Отчёт директору"
          storageKey="report_expanded"
          defaultExpanded={true}
          headerActions={(
            <>
              <button style={secondaryButton} onClick={copyReport}>{copied ? 'Скопировано' : 'Скопировать'}</button>
              <button style={primaryButton} onClick={sendTelegramReport} disabled={telegramSending}>{telegramSending ? 'Отправляем...' : 'Отправить в Telegram'}</button>
            </>
          )}
        >
          <div style={sectionSubTitle}>Краткая управленческая сводка по текущему состоянию</div>
          <pre style={reportBox}>{reportText}</pre>
        </CollapsibleSection>

        {/* Alert */}
        <section style={panel}>
          <div style={sectionTitle}>Alert</div>
          <div style={sectionSubTitle}>Главные блокеры. Клик по строке — скролл к проблеме в Active Issues</div>
          {blockers.length === 0 ? <div style={emptyBox}>Алертов нет</div> : (
            <div style={listWrap}>
              {blockers.map((item) => (
                <button
                  key={item.id}
                  style={alertRowButton}
                  onClick={() => scrollToIssue(item.id)}
                >
                  <div style={listTitle}>{item.project_name || 'Без объекта'} — {item.title}</div>
                  <div style={metaLine}>Этап: {item.stage || 'прочее'} · Причина: {item.reason || 'прочее'} · Материал: {item.material || 'не указан'} · Длится: {item.days_count || 1} дн.</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Активные проблемы */}
        <section style={panel} id="active-issues">
            <div style={panelHeader}>
              <div>
                <div style={sectionTitle}>Активные проблемы</div>
                <div style={sectionSubTitle}>Здесь директор видит реальные открытые проблемы с этапом, материалом, причиной и ответственным</div>
              </div>
              <div style={actionRow}>
                <select style={projectSelect} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                  <option value="all">Этап: все</option>
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>Этап: {stage}</option>
                  ))}
                </select>
                <button style={problemFilter === 'all' ? activeFilterButton : filterButton} onClick={() => setProblemFilter('all')}>Все</button>
                <button style={problemFilter === 'red' ? activeFilterButton : filterButton} onClick={() => setProblemFilter('red')}>Проблемы</button>
                <button style={problemFilter === 'yellow' ? activeFilterButton : filterButton} onClick={() => setProblemFilter('yellow')}>Риски</button>
              </div>
            </div>

            <div style={{ ...actionRow, justifyContent: 'flex-end', marginBottom: 12 }}>
              <div style={toggleGroup}>
                <button
                  style={issuesViewMode === 'list' ? toggleActive : toggleButton}
                  onClick={() => setIssuesViewMode('list')}
                >
                  Список ({filteredProblems.length})
                </button>
                <button
                  style={issuesViewMode === 'by_project' ? toggleActive : toggleButton}
                  onClick={() => setIssuesViewMode('by_project')}
                >
                  По объектам ({groupedIssues.length} объектов)
                </button>
              </div>
              {issuesViewMode === 'by_project' ? (
                <>
                  <button style={secondaryButton} onClick={expandAllToStages}>Развернуть всё</button>
                  <button style={secondaryButton} onClick={collapseAll}>Свернуть всё</button>
                </>
              ) : null}
            </div>

            <div style={tableWrap}>
              {issuesViewMode === 'list' ? (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={cellHeader}>Проблема</th>
                      <th style={cellHeader}>Этап</th>
                      <th style={cellHeader}>Материал</th>
                      <th style={cellHeader}>Причина</th>
                      <th style={cellHeader}>Ответственный</th>
                      <th style={cellHeader}>Статус</th>
                      <th style={cellHeader}>Длится</th>
                      <th style={cellHeader}>Фото</th>
                      <th style={cellHeader}>История</th>
                      <th style={cellHeader}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProblems.length === 0 ? (
                      <tr><td style={emptyCell} colSpan={10}>Активных проблем нет</td></tr>
                    ) : filteredProblems.map((problem) => (
                      <tr key={problem.id} id={`issue-${problem.id}`} style={highlightedIssueId === problem.id ? highlightedRow : undefined}>
                        <td style={cellStrong}>
                          <div>{problem.title}</div>
                          <div style={subCellText}>{problem.project_name || 'Без объекта'}</div>
                          <div style={tinyCellText}>{problem.grouping_key || problem.problem_key || problem.id}</div>
                        </td>
                        <td style={cell}>{problem.stage || 'Без этапа'}</td>
                        <td style={cell}>{problem.material || 'не указан'}</td>
                        <td style={cell}>{problem.reason || 'прочее'}</td>
                        <td style={cell}>{problem.responsible_person || 'Не назначен'}</td>
                        <td style={cell}><span style={severityStyle(problem.severity)}>{severityLabel(problem.severity)}</span></td>
                        <td style={cell}>{problem.days_count || 1} дн.</td>
                        <td style={cell}>{problem.photo_url ? <a href={problem.photo_url} target="_blank" rel="noreferrer" style={linkStyle}>📷 Фото</a> : '-'}</td>
                        <td style={cell}><button style={secondaryMiniButton} onClick={() => { setHistoryModalProblem(problem); setSelectedProblemForHistory(problem.id) }}>История</button></td>
                        <td style={cell}>
                          <div style={actionsCol}>
                            <button style={actionChip} onClick={() => showToast('UI: Взято на контроль')}>Взять на контроль</button>
                            <button style={actionChip} onClick={() => requestUpdate(problem)}>Запросить обновление</button>
                            <button
                              style={actionChipDanger}
                              onClick={() => showToast('UI: Закрытие (без backend)')}
                              disabled={closingId === problem.id}
                            >
                              Закрыть
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                groupedIssues.length === 0 ? (
                  <div style={emptyBox}>Нет задач для группировки</div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {groupedIssues.map((proj) => {
                      const projOpen = Boolean(expandedProjects[proj.projectName])
                      return (
                        <div key={proj.projectName} style={groupCard}>
                          <button
                            style={groupHeaderButton}
                            onClick={() => setExpandedProjects((cur) => ({ ...cur, [proj.projectName]: !projOpen }))}
                          >
                            <div>
                              <div style={listTitle}>{proj.projectName}</div>
                              <div style={metaLine}>max duration: {proj.maxDuration} дн.</div>
                            </div>
                            <div style={badgeRow}>
                              <span style={countBadgeRed}>Проблема ×{proj.red}</span>
                              <span style={countBadgeYellow}>Риск ×{proj.yellow}</span>
                            </div>
                          </button>

                          {projOpen ? (
                            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                              {proj.stages.map((st) => {
                                const stageKey = `${proj.projectName}__${st.stageName}`
                                const stageOpen = Boolean(expandedStages[stageKey])
                                return (
                                  <div key={stageKey} style={stageCard}>
                                    <button
                                      style={groupHeaderButton}
                                      onClick={() => setExpandedStages((cur) => ({ ...cur, [stageKey]: !stageOpen }))}
                                    >
                                      <div>
                                        <div style={listTitle}>{st.stageName}</div>
                                        <div style={metaLine}>max duration: {st.maxDuration} дн.</div>
                                      </div>
                                      <div style={badgeRow}>
                                        <span style={countBadgeRed}>Проблема ×{st.red}</span>
                                        <span style={countBadgeYellow}>Риск ×{st.yellow}</span>
                                      </div>
                                    </button>

                                    {stageOpen ? (
                                      <div style={{ marginTop: 10, overflowX: 'auto' }}>
                                        <table style={tableStyle}>
                                          <thead>
                                            <tr>
                                              <th style={cellHeader}>Проблема</th>
                                              <th style={cellHeader}>Ответственный</th>
                                              <th style={cellHeader}>Статус</th>
                                              <th style={cellHeader}>Длится</th>
                                              <th style={cellHeader}>Фото</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {st.tasks.map((problem) => (
                                              <tr key={problem.id} id={`issue-${problem.id}`} style={highlightedIssueId === problem.id ? highlightedRow : undefined}>
                                                <td style={cellStrong}>
                                                  <div>{problem.title}</div>
                                                  <div style={tinyCellText}>{problem.grouping_key || problem.problem_key || problem.id}</div>
                                                </td>
                                                <td style={cell}>{problem.responsible_person || 'Не назначен'}</td>
                                                <td style={cell}><span style={severityStyle(problem.severity)}>{severityLabel(problem.severity)}</span></td>
                                                <td style={cell}>{problem.days_count || 1} дн.</td>
                                                <td style={cell}>{problem.photo_url ? <a href={problem.photo_url} target="_blank" rel="noreferrer" style={linkStyle}>📷 Фото</a> : '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : null}
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>
        </section>

        {/* Последние события */}
        <section style={sidePanel}>
          <div style={panelHeader}>
            <div>
              <div style={sectionTitle}>Последние события</div>
              <div style={sectionSubTitle}>10 последних событий. Можно отфильтровать и показать все</div>
            </div>
            <div style={actionRow}>
              <button style={eventsFilter === 'all' ? activeFilterButton : filterButton} onClick={() => setEventsFilter('all')}>Все</button>
              <button style={eventsFilter === 'problems' ? activeFilterButton : filterButton} onClick={() => setEventsFilter('problems')}>Проблемы</button>
              <button style={eventsFilter === 'photo' ? activeFilterButton : filterButton} onClick={() => setEventsFilter('photo')}>Фото</button>
              <button style={eventsFilter === 'statuses' ? activeFilterButton : filterButton} onClick={() => setEventsFilter('statuses')}>Статусы</button>
            </div>
          </div>

          {visibleEvents.length === 0 ? <div style={emptyBox}>Событий пока нет</div> : visibleEvents.map((event) => (
            <button
              key={event.id}
              style={eventButton}
              onClick={() => (event.issueId ? scrollToIssue(event.issueId) : showToast('Нет привязки к проблеме'))}
            >
              <div style={eventTopRow}>
                <div style={listTitleSmall}>{event.title}</div>
                <span style={eventTypePill(event.type)}>{eventLabel(event.type)}</span>
              </div>
              <div style={metaLine}>{event.projectName} · {formatDateTime(event.at)}</div>
              {event.meta ? <div style={taskSummary}>{event.meta}</div> : null}
              {event.photoUrl ? <div style={metaLine}>📷 есть фото</div> : null}
            </button>
          ))}

          <div style={{ marginTop: 12 }}>
            <button style={secondaryButton} onClick={() => setEventsShowAll((v) => !v)}>
              {eventsShowAll ? 'Свернуть' : 'Показать все'}
            </button>
          </div>
        </section>

        {/* Photos */}
        <section style={panel}>
          <div style={sectionTitle}>Фотоархив</div>
          <div style={sectionSubTitle}>Фото, объект и дата</div>
          {media.length === 0 ? <div style={emptyBox}>Фотоархив пока пуст</div> : (
            <div style={photoGrid}>{media.map((item) => (
              <div key={item.id} style={photoCard}>
                <a href={item.photo_url} target="_blank" rel="noreferrer" style={photoLink}><img src={item.photo_url} alt="Фото объекта" style={photoImage} /></a>
                <div style={photoMeta}>
                  <div style={metaLine}>{item.project_name || 'Без проекта'}</div>
                  <div style={listTitleSmall}>{item.problem_title || 'Фото'}</div>
                  <div style={metaLine}>{formatDateTime(item.created_at)}</div>
                </div>
              </div>
            ))}</div>
          )}
        </section>

        {/* Analytics */}
        <section style={grid4}>
          <SummaryPanel title="Проблемы по этапам" subtitle="Где чаще всего копятся риски и блокеры" items={stageSummary} />
          <SummaryPanel title="Проблемы по причинам" subtitle="Что чаще всего вызывает сбои" items={reasonSummary} />
          <SummaryPanel title="Эффективность сотрудников" subtitle="Кто чаще фигурирует в активных проблемах" items={employeeSummary} />
          <div style={panel}>
            <div style={sectionTitle}>Аналитика</div>
            <div style={sectionSubTitle}>Короткий обзор по выбранному периоду</div>
            <div style={summaryRow}><span>Проблемы</span><strong>{redCount}</strong></div>
            <div style={summaryRow}><span>Риски</span><strong>{yellowCount}</strong></div>
            <div style={summaryRow}><span>Требует внимания</span><strong>{attentionCount}</strong></div>
          </div>
        </section>

        {/* Archive */}
        <CollapsibleSection
          title="Закрытые проблемы"
          count={closedProblems.length}
          storageKey="closed_issues_expanded"
          defaultExpanded={true}
        >
          <div style={sectionSubTitle}>История вручную и автоматически закрытых проблем</div>
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={cellHeader}>Проблема</th>
                  <th style={cellHeader}>Этап</th>
                  <th style={cellHeader}>Материал</th>
                  <th style={cellHeader}>Причина</th>
                  <th style={cellHeader}>Ответственный</th>
                  <th style={cellHeader}>Последнее обновление</th>
                  <th style={cellHeader}>История</th>
                  <th style={cellHeader}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {closedProblems.length === 0 ? <tr><td style={emptyCell} colSpan={8}>Закрытых проблем пока нет</td></tr> : closedProblems.map((problem) => (
                  <tr key={problem.id}>
                    <td style={cellStrong}>
                      <div>{problem.title}</div>
                      <div style={subCellText}>{problem.project_name || 'Без объекта'}</div>
                    </td>
                    <td style={cell}>{problem.stage || 'прочее'}</td>
                    <td style={cell}>{problem.material || 'не указан'}</td>
                    <td style={cell}>{problem.reason || 'прочее'}</td>
                    <td style={cell}>{problem.responsible_person || 'Не указан'}</td>
                    <td style={cell}>{formatDateTime(problem.last_seen_at)}</td>
                    <td style={cell}><button style={secondaryMiniButton} onClick={() => { setHistoryModalProblem(problem); setSelectedProblemForHistory(problem.id) }}>История</button></td>
                    <td style={cell}>{role === 'admin' ? <button style={secondaryMiniButton} onClick={() => reopenProblem(problem.id)} disabled={reopeningId === problem.id}>{reopeningId === problem.id ? 'Открываем...' : 'Переоткрыть'}</button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="История проблем"
          count={filteredHistory.length}
          storageKey="history_expanded"
          defaultExpanded={false}
          headerActions={(
            <>
              <select style={projectSelect} value={selectedProblemForHistory} onChange={(e) => setSelectedProblemForHistory(e.target.value)}>
                <option value="all">Все проблемы</option>
                {problems.map((problem) => (
                  <option key={problem.id} value={problem.id}>{problem.project_name || 'Без проекта'} — {problem.title}</option>
                ))}
              </select>
              {selectedProblemForHistory !== 'all' ? <button style={secondaryButton} onClick={() => setSelectedProblemForHistory('all')}>Сбросить</button> : null}
            </>
          )}
        >
          <div style={sectionSubTitle}>Создание, обновление, закрытие, переоткрытие</div>
          {filteredHistory.length === 0 ? <div style={emptyBox}>Истории пока нет</div> : (
            <div style={listWrap}>{filteredHistory.map((item) => (
              <div key={item.id} style={listItem}>
                <div style={listTitle}>{item.project_name || 'Без объекта'} — {item.problem_title || 'Проблема'}</div>
                <div style={metaLine}>{formatDateTime(item.created_at)}</div>
                <div style={taskSummary}>{item.event}</div>
                {item.comment ? <div style={metaLine}>Комментарий: {item.comment}</div> : null}
              </div>
            ))}</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Сырые задачи / лента WhatsApp"
          count={projectFilteredTasks.slice(0, 80).length}
          storageKey="raw_tasks_expanded"
          defaultExpanded={false}
        >
          <div style={sectionSubTitle}>Первичный поток сообщений. Управленческий смысл теперь в проблемах, этапах, причинах и сотрудниках.</div>
          <div style={tableWrap}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={cellHeader}>Кто отправил</th>
                  <th style={cellHeader}>Объект</th>
                  <th style={cellHeader}>Задача</th>
                  <th style={cellHeader}>Дата</th>
                  <th style={cellHeader}>Статус</th>
                  <th style={cellHeader}>Комментарий</th>
                  <th style={cellHeader}>Фото</th>
                </tr>
              </thead>
              <tbody>
                {projectFilteredTasks.slice(0, 80).map((task) => (
                  <tr key={task.id}>
                    <td style={cell}>{task.sender_name || 'Не указан'}</td>
                    <td style={cell}>{task.project_name || '-'}</td>
                    <td style={cellStrong}>{task.title}</td>
                    <td style={cell}>{formatDate(task.updated_at || task.planned_date)}</td>
                    <td style={cell}><span style={taskStatusStyle(task.color_indicator)}>{taskStatusText(task.color_indicator)}</span></td>
                    <td style={cell}>{task.ai_summary || '-'}</td>
                    <td style={cell}>{task.photo_url ? <a href={task.photo_url} target="_blank" rel="noreferrer" style={linkStyle}>📷 Фото</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        <section style={panel}>
          <div style={sectionTitle}>Настройки уведомлений</div>
          <div style={sectionSubTitle}>Управление Telegram уведомлениями для вашей компании</div>

          {settingsLoading ? (
            <div style={emptyBox}>Загрузка настроек...</div>
          ) : (
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900 }}>Telegram уведомления</div>
                <div style={toggleGroup}>
                  <button style={telegramEnabled ? toggleActive : toggleButton} onClick={toggleTelegramEnabled} disabled={telegramSaving}>
                    ВКЛ
                  </button>
                  <button style={!telegramEnabled ? toggleActive : toggleButton} onClick={toggleTelegramEnabled} disabled={telegramSaving}>
                    ВЫКЛ
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 900 }}>Chat ID:</div>
                <input
                  style={{ ...dateInput, minWidth: 260 }}
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="123456789"
                />
                <button style={secondaryButton} onClick={saveTelegramChatId} disabled={telegramSaving}>
                  {telegramSaving ? 'Сохраняем...' : 'Сохранить'}
                </button>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 900 }}>Уведомлять при:</div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#475569', fontWeight: 800 }}>
                  <input type="checkbox" checked readOnly /> Проблема
                </label>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#475569', fontWeight: 800 }}>
                  <input type="checkbox" checked readOnly /> Риск
                </label>
              </div>
            </div>
          )}
        </section>
      </div>

      {uiToast ? (
        <div style={toastWrap}>
          <div style={toastCard}>{uiToast}</div>
        </div>
      ) : null}

      {historyModalProblem ? (
        <div style={modalOverlay} onClick={() => setHistoryModalProblem(null)}>
          <div style={modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <div style={sectionTitle}>История: {historyModalProblem.project_name || 'Без объекта'} — {historyModalProblem.title}</div>
                <div style={sectionSubTitle}>{historyModalProblem.grouping_key || historyModalProblem.problem_key || historyModalProblem.id}</div>
              </div>
              <button style={secondaryButton} onClick={() => setHistoryModalProblem(null)}>Закрыть</button>
            </div>
            {modalHistory.length === 0 ? <div style={emptyBox}>Истории по этой проблеме пока нет</div> : (
              <div style={modalList}>{modalHistory.map((item) => (
                <div key={item.id} style={listItem}>
                  <div style={listTitle}>{item.event}</div>
                  <div style={metaLine}>{formatDateTime(item.created_at)}</div>
                  {item.comment ? <div style={taskSummary}>Комментарий: {item.comment}</div> : null}
                </div>
              ))}</div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  )
}

function KpiCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ ...kpiCardButton, borderColor: `${color}55` }}
    >
      <div style={kpiLabel}><span style={{ ...dot, background: color }} />{label}</div>
      <div style={kpiValue}>{value}</div>
    </button>
  )
}

function CollapsibleSection({
  title,
  count,
  storageKey,
  defaultExpanded,
  headerActions,
  children,
}: {
  title: string
  count?: number
  storageKey: string
  defaultExpanded: boolean
  headerActions?: ReactNode
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey)
      if (saved === null) {
        setExpanded(defaultExpanded)
      } else {
        setExpanded(saved === '1')
      }
    } catch {
      setExpanded(defaultExpanded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, expanded ? '1' : '0')
    } catch {
      // ignore
    }
  }, [expanded, storageKey])

  return (
    <section style={panel}>
      <div style={panelHeader}>
        <div>
          <div style={sectionTitle}>
            {title}
            {typeof count === 'number' ? <span style={sectionCount}> · {count}</span> : null}
          </div>
        </div>
        <div style={actionRow}>
          {headerActions}
          <button style={secondaryButton} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Свернуть' : 'Развернуть'}
          </button>
        </div>
      </div>
      {expanded ? children : null}
    </section>
  )
}

function SummaryPanel({ title, subtitle, items }: { title: string; subtitle: string; items: [string, number][] }) {
  return (
    <div style={panel}>
      <div style={sectionTitle}>{title}</div>
      <div style={sectionSubTitle}>{subtitle}</div>
      {items.length === 0 ? <div style={emptyBox}>Нет данных</div> : items.map(([name, count]) => (
        <div key={name} style={summaryRow}>
          <span>{name}</span>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  )
}

function severityStyle(value: Severity): CSSProperties {
  if (value === 'red') return { ...pill, background: '#fee2e2', color: '#991b1b' }
  if (value === 'yellow') return { ...pill, background: '#fef3c7', color: '#92400e' }
  return { ...pill, background: '#dcfce7', color: '#166534' }
}

function taskStatusStyle(value: Severity): CSSProperties {
  if (value === 'red') return { ...smallPill, background: '#fee2e2', color: '#991b1b' }
  if (value === 'yellow') return { ...smallPill, background: '#fef3c7', color: '#92400e' }
  return { ...smallPill, background: '#dcfce7', color: '#166534' }
}

const pageWrap: CSSProperties = { minHeight: '100vh', background: '#f3f4f6', color: '#0f172a', padding: '28px' }
const container: CSSProperties = { maxWidth: 1480, margin: '0 auto' }
const header: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 18 }
const title: CSSProperties = { fontSize: 34, lineHeight: 1.1, margin: 0, fontWeight: 800 }
const subtitle: CSSProperties = { color: '#64748b', marginTop: 10, fontSize: 14 }
const filtersRow: CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }
const projectSelect: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: '#fff', minWidth: 150 }
const dateInput: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', background: '#fff' }
const kpiGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }
const kpiCard: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, boxShadow: '0 1px 8px rgba(15,23,42,.06)' }
const kpiCardButton: CSSProperties = { ...kpiCard, cursor: 'pointer', textAlign: 'left' as const }
const kpiLabel: CSSProperties = { fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 7 }
const kpiValue: CSSProperties = { fontSize: 36, fontWeight: 800, marginTop: 14 }
const dot: CSSProperties = { width: 10, height: 10, borderRadius: 99, display: 'inline-block' }
const panel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, boxShadow: '0 1px 8px rgba(15,23,42,.06)' }
const sidePanel: CSSProperties = { ...panel, alignSelf: 'start' }
const panelHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 14 }
const sectionTitle: CSSProperties = { fontSize: 22, fontWeight: 800, marginBottom: 6 }
const sectionSubTitle: CSSProperties = { fontSize: 13, color: '#64748b' }
const sectionCount: CSSProperties = { fontSize: 14, color: '#64748b', fontWeight: 800 }
const actionRow: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }
const primaryButton: CSSProperties = { background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }
const secondaryButton: CSSProperties = { background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', fontWeight: 700, cursor: 'pointer' }
const reportBox: CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.55, minHeight: 220 }
const grid4: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginTop: 18, marginBottom: 18 }
const mainGrid: CSSProperties = { display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, alignItems: 'start', marginBottom: 18 }
const twoCols: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }
const tableWrap: CSSProperties = { overflowX: 'auto' }
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const cellHeader: CSSProperties = { textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0', padding: '12px 10px', whiteSpace: 'nowrap' }
const cell: CSSProperties = { borderBottom: '1px solid #edf2f7', padding: '12px 10px', verticalAlign: 'top' }
const cellStrong: CSSProperties = { ...cell, fontWeight: 800 }
const subCellText: CSSProperties = { color: '#64748b', fontSize: 12, marginTop: 3, fontWeight: 600 }
const tinyCellText: CSSProperties = { color: '#94a3b8', fontSize: 11, marginTop: 3, fontWeight: 500 }
const emptyCell: CSSProperties = { padding: 22, textAlign: 'center', color: '#94a3b8', borderBottom: '1px solid #edf2f7' }
const emptyBox: CSSProperties = { padding: 16, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', marginTop: 12 }
const pill: CSSProperties = { display: 'inline-flex', minWidth: 74, justifyContent: 'center', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 }
const smallPill: CSSProperties = { display: 'inline-flex', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800 }
const activeFilterButton: CSSProperties = { ...primaryButton, padding: '8px 12px' }
const filterButton: CSSProperties = { ...secondaryButton, padding: '8px 12px' }
const closeButton: CSSProperties = { ...primaryButton, padding: '8px 12px' }
const secondaryMiniButton: CSSProperties = { ...secondaryButton, padding: '7px 10px', fontSize: 12 }
const linkStyle: CSSProperties = { color: '#0f172a', fontWeight: 800, textDecoration: 'none' }
const listWrap: CSSProperties = { display: 'grid', gap: 10, marginTop: 12 }
const listItem: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }
const listTitle: CSSProperties = { fontWeight: 800, marginBottom: 4 }
const listTitleSmall: CSSProperties = { fontWeight: 800, marginBottom: 5, fontSize: 13 }
const metaLine: CSSProperties = { color: '#64748b', fontSize: 12, lineHeight: 1.45 }
const taskSummary: CSSProperties = { color: '#334155', fontSize: 13, marginTop: 6 }
const eventCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, marginTop: 10, background: '#fff' }
const eventButton: CSSProperties = { ...eventCard, width: '100%', textAlign: 'left' as const, cursor: 'pointer', display: 'block' }
const eventTopRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }
const blockerCard: CSSProperties = { border: '1px solid #fee2e2', borderRadius: 12, padding: 12, marginTop: 10, background: '#fff7f7' }
const summaryRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px', marginTop: 10 }
const photoGrid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 12 }
const photoCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', background: '#fff' }
const photoLink: CSSProperties = { display: 'block' }
const photoImage: CSSProperties = { width: '100%', height: 170, objectFit: 'cover', display: 'block' }
const photoMeta: CSSProperties = { padding: 12 }
const loadingBox: CSSProperties = { background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0' }
const errorBox: CSSProperties = { background: '#fee2e2', color: '#991b1b', padding: 14, borderRadius: 12, marginBottom: 14, border: '1px solid #fecaca' }
const clientModeBox: CSSProperties = { background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 12, marginBottom: 14, border: '1px solid #bbf7d0', fontWeight: 700 }
const warningBox: CSSProperties = { background: '#fef3c7', color: '#92400e', padding: 12, borderRadius: 12, marginBottom: 14, border: '1px solid #fde68a', fontWeight: 700 }
const highlightedRow: CSSProperties = { background: '#fef9c3' }
const actionsCol: CSSProperties = { display: 'grid', gap: 6, minWidth: 170 }
const actionChip: CSSProperties = { background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', fontWeight: 800, cursor: 'pointer', fontSize: 12 }
const actionChipDanger: CSSProperties = { ...actionChip, border: '1px solid #fecaca', background: '#fff7f7', color: '#991b1b' }
const alertRowButton: CSSProperties = { ...blockerCard, cursor: 'pointer', width: '100%', textAlign: 'left' as const }
const toastWrap: CSSProperties = { position: 'fixed', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none' }
const toastCard: CSSProperties = { background: '#0f172a', color: '#fff', borderRadius: 999, padding: '10px 14px', fontWeight: 800, boxShadow: '0 10px 28px rgba(15,23,42,.28)' }
const toggleGroup: CSSProperties = { display: 'inline-flex', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 12, padding: 3, gap: 3 }
const toggleButton: CSSProperties = { background: 'transparent', border: 'none', borderRadius: 10, padding: '8px 10px', fontWeight: 900, cursor: 'pointer', color: '#334155' }
const toggleActive: CSSProperties = { ...toggleButton, background: '#0f172a', color: '#fff' }
const groupCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 16, padding: 12, background: '#fff' }
const stageCard: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 14, padding: 10, background: '#f8fafc' }
const groupHeaderButton: CSSProperties = { width: '100%', textAlign: 'left' as const, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }
const badgeRow: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }
const countBadgeRed: CSSProperties = { ...smallPill, background: '#fee2e2', color: '#991b1b' }
const countBadgeYellow: CSSProperties = { ...smallPill, background: '#fef3c7', color: '#92400e' }

function eventLabel(type: EventsFilter) {
  if (type === 'problems') return 'Проблемы'
  if (type === 'photo') return 'Фото'
  if (type === 'statuses') return 'Статусы'
  return 'Все'
}

function eventTypePill(type: EventsFilter): CSSProperties {
  if (type === 'problems') return { ...smallPill, background: '#e0e7ff', color: '#3730a3' }
  if (type === 'photo') return { ...smallPill, background: '#dcfce7', color: '#166534' }
  if (type === 'statuses') return { ...smallPill, background: '#fef3c7', color: '#92400e' }
  return { ...smallPill, background: '#e2e8f0', color: '#334155' }
}
const modalOverlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const modalCard: CSSProperties = { width: 'min(760px, 100%)', maxHeight: '82vh', overflow: 'auto', background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 18px 60px rgba(15,23,42,.25)' }
const modalHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 12 }
const modalList: CSSProperties = { display: 'grid', gap: 10 }
const authChip: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 999, background: '#fff', fontWeight: 800, color: '#334155' }
