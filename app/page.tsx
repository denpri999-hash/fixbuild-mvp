'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'

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
  stage: string | null
  material: string | null
  reason: string | null
  responsible_person: string | null
  photo_url: string | null
  problem_key: string | null
  grouping_key: string | null
}

type Project = {
  id: string
  name: string
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
}

type ProblemFilter = 'all' | 'red' | 'yellow'

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

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, planned_date, color_indicator, ai_summary, project_name, project_id, sender_name, sender_phone, photo_url, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(300)

    if (error) throw error
    setTasks((data || []) as Task[])
  }

  async function fetchProblems() {
    const { data, error } = await supabase
      .from('problems')
      .select('id, title, status, severity, first_seen_at, last_seen_at, days_count, is_active, project_name, project_id, stage, material, reason, responsible_person, photo_url, problem_key, grouping_key')
      .order('last_seen_at', { ascending: false })

    if (error) throw error
    setProblems((data || []) as Problem[])
  }

  async function fetchProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) throw error
    setProjects((data || []) as Project[])
  }

  async function fetchHistory() {
    const { data, error } = await supabase
      .from('problem_history')
      .select('id, problem_id, event, project_name, problem_title, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    setHistory((data || []) as ProblemHistory[])
  }

  async function fetchMedia() {
    const { data, error } = await supabase
      .from('problem_media')
      .select('id, task_id, problem_id, project_id, project_name, problem_title, sender_name, comment, photo_url, created_at')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) throw error
    setMedia((data || []) as ProblemMedia[])
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
    fetchAll()
  }, [])

  const activeProblemsBase = useMemo(() => {
    return problems
      .filter((p) => p.status === 'open' && p.is_active !== false)
      .filter((p) => selectedProject === 'all' || p.project_name === selectedProject)
      .filter((p) => isInsideDateRange(p.last_seen_at, dateFrom, dateTo))
  }, [problems, selectedProject, dateFrom, dateTo])

  const closedProblems = useMemo(() => {
    return problems
      .filter((p) => p.status === 'closed' || p.is_active === false)
      .filter((p) => selectedProject === 'all' || p.project_name === selectedProject)
      .filter((p) => isInsideDateRange(p.last_seen_at, dateFrom, dateTo))
      .slice(0, 30)
  }, [problems, selectedProject, dateFrom, dateTo])

  const filteredProblems = useMemo(() => {
    const result = activeProblemsBase.filter((p) => {
      if (problemFilter === 'red') return p.severity === 'red'
      if (problemFilter === 'yellow') return p.severity === 'yellow'
      return true
    })

    return [...result].sort((a, b) => {
      const bySeverity = (severityOrder[a.severity || 'green'] || 99) - (severityOrder[b.severity || 'green'] || 99)
      if (bySeverity !== 0) return bySeverity
      return new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime()
    })
  }, [activeProblemsBase, problemFilter])

  const projectFilteredTasks = useMemo(() => {
    return tasks
      .filter((t) => selectedProject === 'all' || t.project_name === selectedProject)
      .filter((t) => isInsideDateRange(t.updated_at, dateFrom, dateTo))
  }, [tasks, selectedProject, dateFrom, dateTo])

  const recentTasks = useMemo(() => projectFilteredTasks.slice(0, 12), [projectFilteredTasks])

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

  const filteredHistory = useMemo(() => {
    let scoped = selectedProject === 'all' ? history : history.filter((h) => h.project_name === selectedProject)
    if (selectedProblemForHistory !== 'all') {
      scoped = scoped.filter((h) => h.problem_id === selectedProblemForHistory)
    }
    return scoped.filter((h) => isInsideDateRange(h.created_at, dateFrom, dateTo)).slice(0, 25)
  }, [history, selectedProject, selectedProblemForHistory, dateFrom, dateTo])

  const modalHistory = useMemo(() => {
    if (!historyModalProblem) return []
    return history
      .filter((item) => item.problem_id === historyModalProblem.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [history, historyModalProblem])

  const filteredMedia = useMemo(() => {
    return media
      .filter((m) => selectedProject === 'all' || m.project_name === selectedProject)
      .filter((m) => isInsideDateRange(m.created_at, dateFrom, dateTo))
      .slice(0, 20)
  }, [media, selectedProject, dateFrom, dateTo])

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
          </div>
        </header>

        {errorText ? <div style={errorBox}>{errorText}</div> : null}

        <section style={kpiGrid}>
          <KpiCard label="Проблемы" value={redCount} color="#ef4444" />
          <KpiCard label="Риски" value={yellowCount} color="#f59e0b" />
          <KpiCard label="В норме" value={greenCount} color="#22c55e" />
          <KpiCard label="Требует внимания" value={attentionCount} color="#f97316" />
        </section>

        <section style={panel}>
          <div style={panelHeader}>
            <div>
              <div style={sectionTitle}>Отчет директору</div>
              <div style={sectionSubTitle}>Краткая управленческая сводка по текущему состоянию</div>
            </div>
            <div style={actionRow}>
              <button style={secondaryButton} onClick={copyReport}>{copied ? 'Скопировано' : 'Скопировать отчет'}</button>
              <button style={primaryButton} onClick={sendTelegramReport} disabled={telegramSending}>{telegramSending ? 'Отправляем...' : 'Отправить в Telegram'}</button>
            </div>
          </div>
          <pre style={reportBox}>{reportText}</pre>
        </section>

        <section style={grid4}>
          <SummaryPanel title="Проблемы по этапам" subtitle="Где чаще всего копятся риски и блокеры" items={stageSummary} />
          <SummaryPanel title="Проблемы по причинам" subtitle="Что чаще всего вызывает сбои" items={reasonSummary} />
          <SummaryPanel title="Эффективность сотрудников" subtitle="Кто чаще фигурирует в активных проблемах" items={employeeSummary} />
          <div style={panel}>
            <div style={sectionTitle}>Главные блокеры</div>
            <div style={sectionSubTitle}>Критичные активные проблемы по срокам и повторяемости</div>
            {blockers.length === 0 ? <div style={emptyBox}>Блокеров нет</div> : blockers.map((item) => (
              <div key={item.id} style={blockerCard}>
                <div style={listTitle}>{item.project_name || 'Без объекта'} — {item.title}</div>
                <div style={metaLine}>Этап: {item.stage || 'прочее'} · Причина: {item.reason || 'прочее'} · Материал: {item.material || 'не указан'}</div>
                <div style={metaLine}>Ответственный: {item.responsible_person || 'Не указан'} · Длится: {item.days_count || 1} дн.</div>
              </div>
            ))}
          </div>
        </section>

        <section style={mainGrid}>
          <div style={sidePanel}>
            <div style={sectionTitle}>Последние события</div>
            <div style={sectionSubTitle}>Свежие записи из задач и WhatsApp</div>
            {recentTasks.length === 0 ? <div style={emptyBox}>Событий пока нет</div> : recentTasks.map((task) => (
              <div key={task.id} style={eventCard}>
                <div style={eventTopRow}>
                  <div style={listTitleSmall}>{task.title}</div>
                  <span style={taskStatusStyle(task.color_indicator)}>{taskStatusText(task.color_indicator)}</span>
                </div>
                <div style={metaLine}>{task.project_name || 'Без объекта'} · {task.sender_name || 'Не указан'} · {formatDateTime(task.updated_at)}</div>
                <div style={taskSummary}>{task.ai_summary || 'Без комментария'}</div>
              </div>
            ))}
          </div>

          <div style={panel}>
            <div style={panelHeader}>
              <div>
                <div style={sectionTitle}>Активные проблемы</div>
                <div style={sectionSubTitle}>Здесь директор видит реальные открытые проблемы с этапом, материалом, причиной и ответственным</div>
              </div>
              <div style={actionRow}>
                <button style={problemFilter === 'all' ? activeFilterButton : filterButton} onClick={() => setProblemFilter('all')}>Все</button>
                <button style={problemFilter === 'red' ? activeFilterButton : filterButton} onClick={() => setProblemFilter('red')}>Проблемы</button>
                <button style={problemFilter === 'yellow' ? activeFilterButton : filterButton} onClick={() => setProblemFilter('yellow')}>Риски</button>
              </div>
            </div>

            <div style={tableWrap}>
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
                    <th style={cellHeader}>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProblems.length === 0 ? (
                    <tr><td style={emptyCell} colSpan={10}>{emptyText(problemFilter)}</td></tr>
                  ) : filteredProblems.map((problem) => (
                    <tr key={problem.id}>
                      <td style={cellStrong}>
                        <div>{problem.title}</div>
                        <div style={subCellText}>{problem.project_name || 'Без объекта'}</div>
                        <div style={tinyCellText}>{problem.grouping_key || problem.problem_key || problem.id}</div>
                      </td>
                      <td style={cell}>{problem.stage || 'прочее'}</td>
                      <td style={cell}>{problem.material || 'не указан'}</td>
                      <td style={cell}>{problem.reason || 'прочее'}</td>
                      <td style={cell}>{problem.responsible_person || 'Не указан'}</td>
                      <td style={cell}><span style={severityStyle(problem.severity)}>{severityLabel(problem.severity)}</span></td>
                      <td style={cell}>{problem.days_count || 1} дн.</td>
                      <td style={cell}>{problem.photo_url ? <a href={problem.photo_url} target="_blank" rel="noreferrer" style={linkStyle}>📷 Фото</a> : '-'}</td>
                      <td style={cell}><button style={secondaryMiniButton} onClick={() => { setHistoryModalProblem(problem); setSelectedProblemForHistory(problem.id) }}>История</button></td>
                      <td style={cell}>{role === 'admin' ? <button style={closeButton} onClick={() => closeProblem(problem.id)} disabled={closingId === problem.id}>{closingId === problem.id ? 'Закрываем...' : 'Закрыть'}</button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={panel}>
          <div style={sectionTitle}>Закрытые проблемы</div>
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
        </section>

        <section style={twoCols}>
          <div style={panel}>
            <div style={panelHeader}>
              <div>
                <div style={sectionTitle}>История проблем</div>
                <div style={sectionSubTitle}>Создание, обновление, закрытие, переоткрытие</div>
              </div>
              <div style={actionRow}>
                <select style={projectSelect} value={selectedProblemForHistory} onChange={(e) => setSelectedProblemForHistory(e.target.value)}>
                  <option value="all">Все проблемы</option>
                  {problems.map((problem) => (
                    <option key={problem.id} value={problem.id}>{problem.project_name || 'Без проекта'} — {problem.title}</option>
                  ))}
                </select>
                {selectedProblemForHistory !== 'all' ? <button style={secondaryButton} onClick={() => setSelectedProblemForHistory('all')}>Сбросить</button> : null}
              </div>
            </div>
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
          </div>

          <div style={panel}>
            <div style={sectionTitle}>Фотоархив</div>
            <div style={sectionSubTitle}>Фото, дата и комментарий для руководителя</div>
            {filteredMedia.length === 0 ? <div style={emptyBox}>Фотоархив пока пуст</div> : (
              <div style={photoGrid}>{filteredMedia.map((item) => (
                <div key={item.id} style={photoCard}>
                  <a href={item.photo_url} target="_blank" rel="noreferrer" style={photoLink}><img src={item.photo_url} alt="Фото объекта" style={photoImage} /></a>
                  <div style={photoMeta}>
                    <div style={listTitleSmall}>{item.problem_title || item.project_name || 'Фото'}</div>
                    <div style={metaLine}>{item.project_name || 'Без проекта'} · {item.sender_name || 'Не указан'}</div>
                    <div style={metaLine}>{formatDateTime(item.created_at)}</div>
                    {item.comment ? <div style={taskSummary}>{item.comment}</div> : null}
                  </div>
                </div>
              ))}</div>
            )}
          </div>
        </section>

        <section style={panel}>
          <div style={sectionTitle}>Сырые задачи / лента WhatsApp</div>
          <div style={sectionSubTitle}>Первичный поток сообщений. Управленческий смысл теперь в проблемах, этапах, причинах, объектах и сотрудниках.</div>
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
        </section>
      </div>

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

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ ...kpiCard, borderColor: `${color}55` }}>
      <div style={kpiLabel}><span style={{ ...dot, background: color }} />{label}</div>
      <div style={kpiValue}>{value}</div>
    </div>
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
const kpiLabel: CSSProperties = { fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 7 }
const kpiValue: CSSProperties = { fontSize: 36, fontWeight: 800, marginTop: 14 }
const dot: CSSProperties = { width: 10, height: 10, borderRadius: 99, display: 'inline-block' }
const panel: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, boxShadow: '0 1px 8px rgba(15,23,42,.06)' }
const sidePanel: CSSProperties = { ...panel, alignSelf: 'start' }
const panelHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 14 }
const sectionTitle: CSSProperties = { fontSize: 22, fontWeight: 800, marginBottom: 6 }
const sectionSubTitle: CSSProperties = { fontSize: 13, color: '#64748b' }
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
const modalOverlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
const modalCard: CSSProperties = { width: 'min(760px, 100%)', maxHeight: '82vh', overflow: 'auto', background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 18px 60px rgba(15,23,42,.25)' }
const modalHeader: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 12 }
const modalList: CSSProperties = { display: 'grid', gap: 10 }
