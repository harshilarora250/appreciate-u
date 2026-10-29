export const DEFAULT_AMOUNTS = [20, 50, 100]
export const MAX_AMOUNT = 100000
export const MAX_PRESETS = 6

export function validUpi(value: string): boolean {
  const upi = value.trim()
  return upi.length <= 100 && /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9][a-zA-Z0-9.-]{1,63}$/.test(upi)
}

export function parseAmount(value: string | null | undefined): number | null {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT ? amount : null
}

export function parsePresets(value: string | null | undefined): number[] {
  if (value == null) return DEFAULT_AMOUNTS
  const result = [...new Set(value.split(',').map((part) => parseAmount(part.trim())).filter((n): n is number => n !== null))]
    .slice(0, MAX_PRESETS)
  return result.length ? result : DEFAULT_AMOUNTS
}

export function sanitizeText(value: string | null | undefined, max = 60): string {
  return (value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
}

export function validColor(value: string | null | undefined): string | null {
  return value && /^#[\da-fA-F]{6}$/.test(value) ? value : null
}

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255)
    const [r, g, b] = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const a = luminance(foreground), b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export type WidgetConfig = { upi: string; name: string; amount: number | null; amounts: number[]; theme: 'dark' | 'light'; color: string | null; cta: string }

export function parseWidget(search: string): WidgetConfig {
  const params = new URLSearchParams(search)
  const upi = (params.get('upi') ?? '').trim()
  const theme = params.get('theme') === 'light' ? 'light' : 'dark'
  return {
    upi: validUpi(upi) ? upi : '',
    name: sanitizeText(params.get('name')),
    amount: parseAmount(params.get('amount')),
    amounts: parsePresets(params.get('amounts')),
    theme,
    color: validColor(params.get('color')),
    cta: sanitizeText(params.get('cta'), 32),
  }
}

export function buildPaymentLink(upi: string, amount: number | null, name = ''): string {
  if (!validUpi(upi)) throw new Error('Enter a valid UPI ID.')
  if (amount !== null && (parseAmount(String(amount)) === null)) throw new Error('Enter a valid amount.')
  const url = new URL('upi://pay')
  url.searchParams.set('pa', upi.trim())
  if (name.trim()) url.searchParams.set('pn', sanitizeText(name, 60))
  if (amount !== null) url.searchParams.set('am', amount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1'))
  url.searchParams.set('cu', 'INR')
  return url.toString()
}

export function buildWidgetUrl(origin: string, config: { upi: string; name?: string; amount?: string; amounts?: string; theme?: string; color?: string }): string {
  const url = new URL('/embed', origin)
  Object.entries(config).forEach(([key, value]) => { if (value?.trim()) url.searchParams.set(key, value.trim()) })
  return url.toString()
}

export function iframeMarkup(url: string): string {
  const safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<iframe src="${safe}" title="UPI tipping widget" width="320" height="420" loading="lazy" style="border:0;border-radius:16px;max-width:100%;"></iframe>`
}
