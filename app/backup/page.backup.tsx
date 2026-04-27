'use client'

import React, { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Task = {
  id: string
  title: string
  planned_date: string | null
  color_indicator: 'green' | 'yellow' | 'red' | null
  ai_summary: string | null
  project_name: string | null
  sender_name: string | null
  sender_phone?: string | null
  photo_url: string | null
  status: string | null
  updated_at: string | null
}

type FilterType = 'all' | 'green' | 'yellow' | 'red'

const PROJECT_OPTIONS = ['ЖК Асар', 'ЖК Орда', 'БЦ Central', 'Склад', 'Без объекта']

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [copySuccess, setCopySuccess] = useState(false)
  const [sendingDirectorReport, setSendingDirectorReport] = useState(false)
  const [selectedProject, setSelectedProject] = useState(PROJECT_OPTIONS[0])
  const [senderName, setSenderName] = useState('Прораб Иван')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)

    const { data, error } = await supabase
      .from('tasks')
      .select(
        'id, title, planned_date, color_indicator, ai_summary, project_name, sender_name, sender_phone, photo_url, status, updated_at'
      )
      .eq('status', 'active')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Ошибка загрузки задач:', error)
    } else {
      setTasks((data as Task[]) || [])
    }

    setLoading(false)
  }

  async function uploadPhoto(file: File) {
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `tasks/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('task-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from('task-photos')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function handleAddReport() {
    const textarea = document.getElementById('reportInput') as HTMLTextAreaElement | null
    if (!textarea) return

    const text = textarea.value.trim()
    const sender = senderName.trim()

    if (!sender) {
      alert('Укажи, кто отправил отчет')
      return
    }

    if (!text) {
      alert('Введите текст отчета')
      return
    }

    if (submitting || uploadingPhoto) return

    setSubmitting(true)
    textarea.disabled = true

    try {
      const parsed = analyzeText(text)

      let uploadedPhotoUrl: string | null = null

      if (selectedPhoto) {
        setUploadingPhoto(true)
        try {
          uploadedPhotoUrl = await uploadPhoto(selectedPhoto)
        } finally {
          setUploadingPhoto(false)
        }
      }

      if (parsed.color === 'red') {
        try {
          await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 Срыв сроков

Объект: ${selectedProject}
Отправил: ${sender}
Задача: ${text}
Статус: ${getText(parsed.color)}
Комментарий: ${parsed.summary}
Фото: ${uploadedPhotoUrl || 'Нет'}`,
            }),
          })
        } catch (telegramError) {
          console.error('Ошибка отправки в Telegram:', telegramError)
        }
      }

      const { error } = await supabase.from('tasks').insert({
        title: text,
        planned_date: new Date().toISOString().slice(0, 10),
        color_indicator: parsed.color,
        ai_summary: parsed.summary,
        project_name: selectedProject,
        sender_name: sender,
        photo_url: uploadedPhotoUrl,
        status: 'active',
      })

      if (error) {
        console.error('Ошибка сохранения:', error)
        alert('Ошибка сохранения')
        return
      }

      textarea.value = ''
      setSelectedPhoto(null)
      await fetchTasks()
      setFilter(parsed.color)
    } catch (error) {
      console.error('Ошибка при добавлении отчета:', error)
      alert('Не удалось загрузить фото или сохранить отчет')
    } finally {
      textarea.disabled = false
      setSubmitting(false)
      setUploadingPhoto(false)
    }
  }

  async function handleStatusChange(taskId: string, newColor: 'green' | 'yellow' | 'red') {
    if (updatingTaskId) return

    setUpdatingTaskId(taskId)

    const newSummary =
      newColor === 'green'
        ? 'Статус скорректирован руководителем: всё по плану'
        : newColor === 'yellow'
        ? 'Статус скорректирован руководителем: есть риск'
        : 'Статус скорректирован руководителем: просрочка / срыв'

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          color_indicator: newColor,
          ai_summary: newSummary,
        })
        .eq('id', taskId)

      if (error) {
        console.error('Ошибка обновления статуса:', error)
        alert('Не удалось обновить статус')
        return
      }

      await fetchTasks()
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function handleResolveTask(taskId: string) {
    if (updatingTaskId) return

    setUpdatingTaskId(taskId)

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) {
        console.error('Ошибка закрытия задачи:', error)
        alert('Не удалось закрыть задачу')
        return
      }

      await fetchTasks()
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function handleCopyDirectorReport() {
    try {
      await navigator.clipboard.writeText(directorReport.fullText)
      setCopySuccess(true)

      setTimeout(() => {
        setCopySuccess(false)
      }, 2000)
    } catch (error) {
      console.error('Ошибка копирования:', error)
      alert('Не удалось скопировать отчет')
    }
  }

  async function handleSendDirectorReportToTelegram() {
    if (sendingDirectorReport) return

    setSendingDirectorReport(true)

    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: directorReport.fullText }),
      })

      const data = await res.json()
      console.log('Director report telegram response:', data)

      if (!res.ok) {
        alert('Не удалось отправить отчет директору в Telegram')
        return
      }

      alert('Отчет директору отправлен в Telegram')
    } catch (error) {
      console.error('Ошибка отправки отчета директору:', error)
      alert('Ошибка отправки отчета директору в Telegram')
    } finally {
      setSendingDirectorReport(false)
    }
  }

  function analyzeText(text: string) {
    const t = text.toLowerCase()

    if (
      t.includes('не успели') ||
      t.includes('срыв') ||
      t.includes('сорвали') ||
      t.includes('просрочка') ||
      t.includes('не закончили') ||
      t.includes('не завершили') ||
      t.includes('остановили') ||
      t.includes('остановка')
    ) {
      return { color: 'red' as const, summary: 'Срыв сроков' }
    }

    if (
      t.includes('частично') ||
      t.includes('риск') ||
      t.includes('задержка') ||
      t.includes('задержали') ||
      t.includes('не полностью') ||
      t.includes('ждем') ||
      t.includes('ожидаем') ||
      t.includes('нет материала') ||
      t.includes('не пришел материал') ||
      t.includes('не поступил материал')
    ) {
      return { color: 'yellow' as const, summary: 'Есть риск' }
    }

    return { color: 'green' as const, summary: 'Всё по плану' }
  }

  const stats = useMemo(() => {
    return {
      red: tasks.filter(t => t.color_indicator === 'red').length,
      yellow: tasks.filter(t => t.color_indicator === 'yellow').length,
      green: tasks.filter(t => t.color_indicator === 'green').length,
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks
    return tasks.filter(task => task.color_indicator === filter)
  }, [tasks, filter])

  const projectSummary = useMemo(() => {
    const grouped: Record<string, { red: number; yellow: number; green: number }> = {}

    for (const task of tasks) {
      const project = task.project_name || 'Без объекта'
      if (!grouped[project]) {
        grouped[project] = { red: 0, yellow: 0, green: 0 }
      }

      if (task.color_indicator === 'red') grouped[project].red += 1
      if (task.color_indicator === 'yellow') grouped[project].yellow += 1
      if (task.color_indicator === 'green') grouped[project].green += 1
    }

    return Object.entries(grouped)
      .map(([project, counts]) => {
        const totalAttention = counts.red + counts.yellow
        return {
          project,
          ...counts,
          totalAttention,
        }
      })
      .sort((a, b) => b.totalAttention - a.totalAttention)
  }, [tasks])

  const directorReport = useMemo(() => {
    const redTasks = tasks.filter(t => t.color_indicator === 'red')
    const yellowTasks = tasks.filter(t => t.color_indicator === 'yellow')
    const greenTasks = tasks.filter(t => t.color_indicator === 'green')

    const mainBlocker =
      redTasks[0]?.title || yellowTasks[0]?.title || 'Критичных блокеров не найдено'

    const mainProject =
      redTasks[0]?.project_name || yellowTasks[0]?.project_name || 'Без объекта'

    const mainSender =
      redTasks[0]?.sender_name || yellowTasks[0]?.sender_name || 'Не указан'

    const needsAttention = redTasks.length + yellowTasks.length

    const shortConclusion =
      redTasks.length > 0
        ? 'На объектах есть критичные задержки, нужен срочный контроль просроченных задач.'
        : yellowTasks.length > 0
        ? 'Есть риски по части задач, требуется внимание к желтым статусам.'
        : 'Все задачи идут стабильно, критичных отклонений нет.'

    const redList =
      redTasks.length > 0
        ? redTasks
            .slice(0, 5)
            .map(
              (task, index) =>
                `${index + 1}. [${task.project_name || 'Без объекта'}] ${task.title} — ${
                  task.sender_name || 'Не указан'
                }`
            )
            .join('\n')
        : 'Нет'

    const yellowList =
      yellowTasks.length > 0
        ? yellowTasks
            .slice(0, 5)
            .map(
              (task, index) =>
                `${index + 1}. [${task.project_name || 'Без объекта'}] ${task.title} — ${
                  task.sender_name || 'Не указан'
                }`
            )
            .join('\n')
        : 'Нет'

    const projectsList =
      projectSummary.length > 0
        ? projectSummary
            .map(
              item =>
                `- ${item.project}: красных ${item.red}, желтых ${item.yellow}, зеленых ${item.green}`
            )
            .join('\n')
        : 'Нет данных'

    const fullText = `📊 FixBuild — отчет директору

Просрочек: ${redTasks.length}
Рисков: ${yellowTasks.length}
В норме: ${greenTasks.length}
Требует внимания: ${needsAttention}

Главный блокер:
[${mainProject}] ${mainBlocker}
Ответственный / отправил: ${mainSender}

Сводка по объектам:
${projectsList}

Красные задачи:
${redList}

Желтые задачи:
${yellowList}

Вывод:
${shortConclusion}`

    return {
      redCount: redTasks.length,
      yellowCount: yellowTasks.length,
      greenCount: greenTasks.length,
      mainBlocker,
      mainProject,
      mainSender,
      needsAttention,
      shortConclusion,
      fullText,
    }
  }, [tasks, projectSummary])

  return (
    <main style={mainStyle}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>FixBuild Dashboard</h1>

      <div style={statsRow}>
        <button
          onClick={() => setFilter('red')}
          style={filter === 'red' ? statCardRedActive : statCard}
        >
          <div>🔴 Проблемы</div>
          <b style={statNumber}>{stats.red}</b>
        </button>

        <button
          onClick={() => setFilter('yellow')}
          style={filter === 'yellow' ? statCardYellowActive : statCard}
        >
          <div>🟡 Риски</div>
          <b style={statNumber}>{stats.yellow}</b>
        </button>

        <button
          onClick={() => setFilter('green')}
          style={filter === 'green' ? statCardGreenActive : statCard}
        >
          <div>🟢 В норме</div>
          <b style={statNumber}>{stats.green}</b>
        </button>
      </div>

      <div style={directorBox}>
        <div style={directorHeader}>
          <div>
            <h3 style={{ margin: 0 }}>Отчет директору</h3>
            <p style={directorSubtitle}>Краткая управленческая сводка по текущему состоянию</p>
          </div>

          <div style={directorActions}>
            <button onClick={handleCopyDirectorReport} style={btnLight}>
              {copySuccess ? 'Скопировано' : 'Скопировать отчет'}
            </button>

            <button
              onClick={handleSendDirectorReportToTelegram}
              style={btn}
              disabled={sendingDirectorReport}
            >
              {sendingDirectorReport ? 'Отправка...' : 'Отправить в Telegram'}
            </button>
          </div>
        </div>

        <div style={directorGrid}>
          <div style={directorMetricCard}>
            <div style={directorMetricLabel}>Просрочек</div>
            <div style={{ ...directorMetricValue, color: 'red' }}>{directorReport.redCount}</div>
          </div>

          <div style={directorMetricCard}>
            <div style={directorMetricLabel}>Рисков</div>
            <div style={{ ...directorMetricValue, color: 'orange' }}>
              {directorReport.yellowCount}
            </div>
          </div>

          <div style={directorMetricCard}>
            <div style={directorMetricLabel}>В норме</div>
            <div style={{ ...directorMetricValue, color: 'green' }}>
              {directorReport.greenCount}
            </div>
          </div>

          <div style={directorMetricCard}>
            <div style={directorMetricLabel}>Требует внимания</div>
            <div style={directorMetricValue}>{directorReport.needsAttention}</div>
          </div>
        </div>

        <div style={directorTextBlock}>
          <div style={directorTextTitle}>Главный блокер</div>
          <div style={directorTextValue}>
            [{directorReport.mainProject}] {directorReport.mainBlocker}
          </div>
          <div style={{ marginTop: 6, color: '#555' }}>
            Отправил: <b>{directorReport.mainSender}</b>
          </div>
        </div>

        <div style={directorTextBlock}>
          <div style={directorTextTitle}>Сводка по объектам</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {projectSummary.length === 0 ? (
              <div style={directorTextValue}>Нет данных</div>
            ) : (
              projectSummary.map(item => (
                <div key={item.project} style={projectRow}>
                  <div style={{ fontWeight: 700 }}>{item.project}</div>
                  <div style={projectBadges}>
                    <span style={badgeRed}>🔴 {item.red}</span>
                    <span style={badgeYellow}>🟡 {item.yellow}</span>
                    <span style={badgeGreen}>🟢 {item.green}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={directorTextBlock}>
          <div style={directorTextTitle}>Вывод</div>
          <div style={directorTextValue}>{directorReport.shortConclusion}</div>
        </div>
      </div>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>Новый отчет</h3>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Кто отправил</label>
          <input
            type="text"
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            placeholder="Например: Прораб Иван"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Объект</label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={selectStyle}
          >
            {PROJECT_OPTIONS.map(project => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Фото с объекта</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setSelectedPhoto(e.target.files?.[0] || null)
            }
            style={inputStyle}
          />
          {selectedPhoto && (
            <div style={{ marginTop: 6, color: '#555' }}>
              Выбрано: <b>{selectedPhoto.name}</b>
            </div>
          )}
        </div>

        <textarea
          id="reportInput"
          placeholder="Например: ЖК Асар — не успели залить фундамент, не хватает людей"
          style={textareaStyle}
        />

        <button onClick={handleAddReport} disabled={submitting || uploadingPhoto} style={btn}>
          {submitting || uploadingPhoto ? 'Сохраняем...' : 'Отправить отчет'}
        </button>
      </div>

      <div style={sectionHeader}>
        <h3 style={{ margin: 0 }}>Последние отчеты</h3>
      </div>

      <div style={filtersRow}>
        <button
          onClick={() => setFilter('all')}
          style={filter === 'all' ? activeBtn : btnLight}
        >
          Все
        </button>

        <button
          onClick={() => setFilter('green')}
          style={filter === 'green' ? greenBtnActive : btnLight}
        >
          В срок
        </button>

        <button
          onClick={() => setFilter('yellow')}
          style={filter === 'yellow' ? yellowBtnActive : btnLight}
        >
          Риск
        </button>

        <button
          onClick={() => setFilter('red')}
          style={filter === 'red' ? redBtnActive : btnLight}
        >
          Просрочка
        </button>
      </div>

      <div style={box}>
        {loading ? (
          <p>Загрузка...</p>
        ) : (
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
                <th style={cellHeader}>Управление</th>
              </tr>
            </thead>

            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} style={emptyCell}>
                    {getEmptyStateText(filter)}
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <tr key={task.id}>
                    <td style={cell}>{task.sender_name || 'Не указан'}</td>
                    <td style={cell}>{task.project_name || 'Без объекта'}</td>
                    <td style={cell}>{task.title}</td>
                    <td style={cell}>{formatDate(task.planned_date)}</td>
                    <td
                      style={{
                        ...cell,
                        color: getColor(task.color_indicator),
                        fontWeight: 700,
                      }}
                    >
                      {getText(task.color_indicator)}
                    </td>
                    <td style={cell}>{task.ai_summary || '-'}</td>
                    <td style={cell}>
                      {task.photo_url ? (
                        <a href={task.photo_url} target="_blank" rel="noreferrer">
                          Открыть фото
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={cell}>
                      <div style={actionRow}>
                        <button
                          onClick={() => handleStatusChange(task.id, 'green')}
                          disabled={updatingTaskId === task.id || task.color_indicator === 'green'}
                          style={{
                            ...miniGreenBtn,
                            opacity: task.color_indicator === 'green' ? 0.6 : 1,
                          }}
                        >
                          В срок
                        </button>

                        <button
                          onClick={() => handleStatusChange(task.id, 'yellow')}
                          disabled={updatingTaskId === task.id || task.color_indicator === 'yellow'}
                          style={{
                            ...miniYellowBtn,
                            opacity: task.color_indicator === 'yellow' ? 0.6 : 1,
                          }}
                        >
                          Риск
                        </button>

                        <button
                          onClick={() => handleStatusChange(task.id, 'red')}
                          disabled={updatingTaskId === task.id || task.color_indicator === 'red'}
                          style={{
                            ...miniRedBtn,
                            opacity: task.color_indicator === 'red' ? 0.6 : 1,
                          }}
                        >
                          Просрочка
                        </button>

                        <button
                          onClick={() => handleResolveTask(task.id)}
                          disabled={updatingTaskId === task.id}
                          style={miniGrayBtn}
                        >
                          Закрыть
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

/* styles */

const mainStyle: React.CSSProperties = {
  padding: 24,
  fontFamily: 'Arial, sans-serif',
  background: '#f7f7f7',
  minHeight: '100vh',
}

const box: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 10,
  padding: 16,
  marginBottom: 20,
}

const directorBox: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d7d7d7',
  borderRadius: 10,
  padding: 16,
  marginBottom: 20,
}

const directorHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap',
}

const directorActions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const directorSubtitle: React.CSSProperties = {
  margin: '6px 0 0 0',
  color: '#666',
  fontSize: 14,
}

const directorGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  marginBottom: 16,
}

const directorMetricCard: React.CSSProperties = {
  border: '1px solid #e5e5e5',
  borderRadius: 10,
  padding: 12,
  background: '#fafafa',
}

const directorMetricLabel: React.CSSProperties = {
  fontSize: 13,
  color: '#666',
  marginBottom: 6,
}

const directorMetricValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
}

const directorTextBlock: React.CSSProperties = {
  borderTop: '1px solid #eee',
  paddingTop: 12,
  marginTop: 12,
}

const directorTextTitle: React.CSSProperties = {
  fontSize: 13,
  color: '#666',
  marginBottom: 6,
}

const directorTextValue: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
}

const projectRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  alignItems: 'center',
  border: '1px solid #eee',
  borderRadius: 8,
  padding: 10,
  background: '#fafafa',
  flexWrap: 'wrap',
}

const projectBadges: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const badgeRed: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 999,
  background: '#fff5f5',
  color: 'red',
  fontWeight: 700,
  fontSize: 12,
}

const badgeYellow: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 999,
  background: '#fffaf0',
  color: 'orange',
  fontWeight: 700,
  fontSize: 12,
}

const badgeGreen: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 999,
  background: '#f0fff4',
  color: 'green',
  fontWeight: 700,
  fontSize: 12,
}

const statsRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginBottom: 20,
  flexWrap: 'wrap',
}

const statCard: React.CSSProperties = {
  ...box,
  width: 160,
  cursor: 'pointer',
  textAlign: 'left',
}

const statCardRedActive: React.CSSProperties = {
  ...statCard,
  border: '2px solid red',
  background: '#fff5f5',
}

const statCardYellowActive: React.CSSProperties = {
  ...statCard,
  border: '2px solid orange',
  background: '#fffaf0',
}

const statCardGreenActive: React.CSSProperties = {
  ...statCard,
  border: '2px solid green',
  background: '#f0fff4',
}

const statNumber: React.CSSProperties = {
  fontSize: 28,
}

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 600,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
  fontSize: 15,
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
  fontSize: 15,
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  height: 100,
  marginBottom: 10,
  padding: 10,
  fontSize: 16,
  borderRadius: 8,
  border: '1px solid #ccc',
}

const btn: React.CSSProperties = {
  padding: '10px 14px',
  background: '#000',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
}

const btnLight: React.CSSProperties = {
  ...btn,
  background: '#fff',
  color: '#000',
  border: '1px solid #ccc',
}

const activeBtn: React.CSSProperties = {
  ...btn,
}

const greenBtnActive: React.CSSProperties = {
  ...btn,
  background: 'green',
}

const yellowBtnActive: React.CSSProperties = {
  ...btn,
  background: 'orange',
}

const redBtnActive: React.CSSProperties = {
  ...btn,
  background: 'red',
}

const filtersRow: React.CSSProperties = {
  marginBottom: 10,
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

const cellHeader: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: 10,
  textAlign: 'left',
  background: '#fafafa',
}

const cell: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: 10,
  textAlign: 'left',
  verticalAlign: 'top',
}

const emptyCell: React.CSSProperties = {
  textAlign: 'center',
  padding: 20,
  color: '#666',
}

const actionRow: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
}

const miniBtnBase: React.CSSProperties = {
  padding: '6px 8px',
  border: 'none',
  borderRadius: 6,
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
}

const miniGreenBtn: React.CSSProperties = {
  ...miniBtnBase,
  background: 'green',
}

const miniYellowBtn: React.CSSProperties = {
  ...miniBtnBase,
  background: 'orange',
}

const miniRedBtn: React.CSSProperties = {
  ...miniBtnBase,
  background: 'red',
}

const miniGrayBtn: React.CSSProperties = {
  ...miniBtnBase,
  background: '#666',
}

/* helpers */

function getColor(c: Task['color_indicator']) {
  if (c === 'red') return 'red'
  if (c === 'yellow') return 'orange'
  if (c === 'green') return 'green'
  return 'black'
}

function getText(c: Task['color_indicator']) {
  if (c === 'red') return 'Просрочка'
  if (c === 'yellow') return 'Риск'
  if (c === 'green') return 'В срок'
  return '-'
}

function getEmptyStateText(filter: FilterType) {
  if (filter === 'green') return 'Нет задач со статусом "В срок"'
  if (filter === 'yellow') return 'Нет задач со статусом "Риск"'
  if (filter === 'red') return 'Нет задач со статусом "Просрочка" 👍'
  return 'Нет данных'
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ru-RU')
}