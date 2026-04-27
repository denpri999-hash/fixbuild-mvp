import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!token || !chatId) {
      return NextResponse.json(
        { ok: false, error: 'Telegram env vars missing' },
        { status: 500 }
      )
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    })

    const data = await response.json()
    return NextResponse.json({ ok: true, data })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Telegram send failed' },
      { status: 500 }
    )
  }
}