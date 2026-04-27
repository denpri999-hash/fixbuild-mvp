export function normalizePhone(phone: string | null | undefined): string {
    if (!phone) return ''
  
    let raw = String(phone).trim()
  
    // WhatsApp / Green API может прислать:
    // 77055003200@c.us
    // 77055003200@s.whatsapp.net
    // 77055003200
    if (raw.includes('@')) {
      raw = raw.split('@')[0]
    }
  
    // Оставляем только цифры
    let digits = raw.replace(/\D/g, '')
  
    // 8XXXXXXXXXX -> 7XXXXXXXXXX
    if (digits.length === 11 && digits.startsWith('8')) {
      digits = `7${digits.slice(1)}`
    }
  
    // Если вдруг пришло +7..., после очистки уже будет 7XXXXXXXXXX
    return digits
  }
  
  export function extractPhoneFromGreenApiSender(body: any): string {
    const raw =
      body?.senderData?.sender ||
      body?.senderData?.chatId ||
      body?.sender ||
      body?.chatId ||
      ''
  
    return normalizePhone(raw)
  }