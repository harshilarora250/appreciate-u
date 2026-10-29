import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import { buildPaymentLink, buildWidgetUrl, contrastRatio, iframeMarkup, parseAmount, parsePresets, parseWidget, validColor, validUpi } from './core'

describe('URL driven widget configuration', () => {
  it('requires and validates a UPI ID', () => {
    expect(parseWidget('').upi).toBe('')
    expect(parseWidget('?upi=someone%40okaxis').upi).toBe('someone@okaxis')
    expect(validUpi('not a UPI')).toBe(false)
  })
  it('decodes recipient values, falls back on unsupported appearance values, and validates amount independently', () => {
    const config = parseWidget('?upi=someone%40okaxis&name=Riya%20%26%20Co&amount=-4&theme=rainbow&color=red')
    expect(config.name).toBe('Riya & Co')
    expect(config.amount).toBeNull()
    expect(config.theme).toBe('dark')
    expect(config.color).toBeNull()
  })
  it('accepts preset amounts, removes duplicates, limits count, and uses safe defaults for invalid lists', () => {
    expect(parsePresets('10,20,10,0,-3,Infinity,30,40,50,60,70,80')).toEqual([10, 20, 30, 40, 50, 60])
    expect(parsePresets('-5,0,bad')).toEqual([20, 50, 100])
  })
  it('rejects malformed, zero, negative, infinite, and unreasonable amounts', () => {
    for (const input of ['', '0', '-1', 'Infinity', '100000.01', '1e3', '1.234']) expect(parseAmount(input)).toBeNull()
    expect(parseAmount('0.5')).toBe(0.5)
  })
  it('restricts custom colors to six digit hex values', () => {
    expect(validColor('#C6F36B')).toBe('#C6F36B')
    expect(validColor('url(javascript:alert(1))')).toBeNull()
  })
  it('measures QR contrast so low contrast can be surfaced to users', () => {
    expect(contrastRatio('#172019', '#ffffff')).toBeGreaterThan(10)
    expect(contrastRatio('#888888', '#999999')).toBeLessThan(3)
  })
})

describe('UPI links and embed builder', () => {
  it('constructs a correctly encoded UPI payment URI with INR', () => {
    const url = new URL(buildPaymentLink('someone@okaxis', 40, 'Riya & Co'))
    expect(url.protocol).toBe('upi:')
    expect(url.hostname).toBe('pay')
    expect(url.searchParams.get('pa')).toBe('someone@okaxis')
    expect(url.searchParams.get('pn')).toBe('Riya & Co')
    expect(url.searchParams.get('am')).toBe('40')
    expect(url.searchParams.get('cu')).toBe('INR')
  })
  it('rejects unsafe payment input', () => {
    expect(() => buildPaymentLink('oops', 20)).toThrow()
    expect(() => buildPaymentLink('name@bank', 0)).toThrow()
  })
  it('builds encoded widget URLs from the current deployment origin', () => {
    const url = new URL(buildWidgetUrl('https://app.vercel.app', { upi: 'person@okaxis', name: 'A & B', amount: '40', amounts: '10,20,40', theme: 'light' }))
    expect(url.origin).toBe('https://app.vercel.app')
    expect(url.pathname).toBe('/embed')
    expect(url.searchParams.get('name')).toBe('A & B')
    expect(url.searchParams.get('amounts')).toBe('10,20,40')
  })
  it('escapes iframe HTML attributes', () => {
    expect(iframeMarkup('https://example.test/embed?x=1&y="2"')).toContain('&amp;')
    expect(iframeMarkup('https://example.test/embed?x=1&y="2"')).toContain('&quot;')
  })
  it('renders the validated payment URI as both PNG and SVG QR exports', async () => {
    const payload = buildPaymentLink('someone@okaxis', 40)
    const png = await QRCode.toBuffer(payload, { type: 'png', errorCorrectionLevel: 'H', margin: 4 })
    const svg = await QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'H', margin: 4 })
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox')
  })
})
