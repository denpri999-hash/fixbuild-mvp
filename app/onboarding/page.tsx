'use client'

import { useState } from 'react'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: any) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.target)

    await fetch('/api/onboarding', {
      method: 'POST',
      body: JSON.stringify({
        company_name: form.get('company_name'),
        director_name: form.get('director_name'),
        whatsapp_phone: form.get('whatsapp_phone'),
        objects: form.get('objects'),
        comment: form.get('comment'),
      }),
    })

    setLoading(false)
    setDone(true)
  }

  if (done) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Заявка отправлена</h2>
        <p>Мы подключим систему и свяжемся с вами.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 40, maxWidth: 500 }}>
      <h2>Подключение FixBuild</h2>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input name="company_name" placeholder="Название компании" required />
        <input name="director_name" placeholder="ФИО руководителя" />
        <input name="whatsapp_phone" placeholder="WhatsApp номер" required />
        <textarea name="objects" placeholder="Список объектов (через запятую)" />
        <textarea name="comment" placeholder="Комментарий" />

        <button type="submit" disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}