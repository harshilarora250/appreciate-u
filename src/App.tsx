import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { buildPaymentLink, buildWidgetUrl, contrastRatio, iframeMarkup, parseAmount, parseWidget, validUpi, type WidgetConfig } from './core'

type QRProps = { value: string; size?: number; dark?: string; light?: string; className?: string }
function QRImage({ value, size = 220, dark = '#151b16', light = '#ffffff', className = '' }: QRProps) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let live = true
    if (!value) { setSrc(''); return }
    QRCode.toDataURL(value, { width: size * 2, margin: 3, errorCorrectionLevel: 'H', color: { dark, light } })
      .then((data) => { if (live) setSrc(data) }).catch(() => { if (live) setSrc('') })
    return () => { live = false }
  }, [value, size, dark, light])
  return src ? <img className={className} src={src} width={size} height={size} alt="UPI payment QR code" /> : <div className={`qr-placeholder ${className}`} aria-label="QR preview">{value ? 'Preparing QR…' : 'Your QR appears here'}</div>
}

function CopyIcon() {
  return <svg className="copy-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="8.5" y="8.5" width="11" height="12" rx="1.75"/><path d="M15.5 8.5V6.75A1.75 1.75 0 0 0 13.75 5h-7.5A1.75 1.75 0 0 0 4.5 6.75v10A1.75 1.75 0 0 0 6.25 18.5H8.5"/></svg>
}

function DownloadIcon() {
  return <svg className="download-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5v11m0 0 4-4m-4 4-4-4M5 16.5v4h14v-4"/></svg>
}

function QRCodeIcon() {
  return <svg className="qr-code-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="7" height="7" rx=".5"/><rect x="5.5" y="5.5" width="3" height="3" rx=".25"/><rect x="13.5" y="3.5" width="7" height="7" rx=".5"/><rect x="15.5" y="5.5" width="3" height="3" rx=".25"/><rect x="3.5" y="13.5" width="7" height="7" rx=".5"/><rect x="5.5" y="15.5" width="3" height="3" rx=".25"/><path d="M14 13.5h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 2h2v2h-2zm-4-8h2v2h-2zm6 4h2v2h-2z"/></svg>
}

function ArrowIcon({ direction = 'up-right' }: { direction?: 'up-right' | 'right' | 'left' }) {
  const paths = direction === 'right' ? 'M4 12h15m-6-6 6 6-6 6' : direction === 'left' ? 'M20 12H5m6 6-6-6 6-6' : 'M7 17 17 7M8 7h9v9'
  return <svg className={`arrow-icon arrow-${direction}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={paths}/></svg>
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1800) }
    catch { setCopied(false) }
  }
  return { copied, copy }
}

function Widget({ config, compact = false }: { config: WidgetConfig; compact?: boolean }) {
  const [amount, setAmount] = useState<number | null>(config.amount ?? config.amounts[0] ?? 20)
  const [custom, setCustom] = useState('')
  const [notice, setNotice] = useState('')
  const { copied, copy } = useCopy()
  const isValid = validUpi(config.upi)
  const activeAmount = custom ? parseAmount(custom) : amount
  const link = useMemo(() => isValid ? buildPaymentLink(config.upi, activeAmount, config.name) : '', [isValid, config.upi, config.name, activeAmount])
  const accent = config.color ?? '#c6f36b'
  const setCustomValue = (value: string) => {
    setCustom(value)
    const parsed = parseAmount(value)
    if (parsed) setAmount(parsed)
    else if (!value) setAmount(config.amount ?? config.amounts[0] ?? 20)
  }
  if (!isValid) return <div className={`widget ${config.theme} ${compact ? 'compact' : ''}`}><div className="widget-error"><span className="error-mark">!</span><strong>Widget needs a UPI ID</strong><p>Add a valid recipient ID to the widget URL to get started.</p></div></div>
  return <section className={`widget ${config.theme} ${compact ? 'compact' : ''}`} style={{ '--widget-accent': accent } as React.CSSProperties}>
    <div className="widget-topline"><span className="mini-mark">a.</span><span>{config.cta || 'A little appreciation'}</span></div>
    <div className="recipient"><div className="recipient-avatar">{(config.name || config.upi).slice(0, 1).toUpperCase()}</div><div className="recipient-copy">{config.name && <strong>{config.name}</strong>}<span>{config.upi}</span></div><span className="verified-dot" title="UPI ID supplied by recipient"><ArrowIcon /></span></div>
    <div className="widget-qr-frame"><QRImage value={activeAmount ? link : ''} size={112} dark="#172019" light="#ffffff" className="widget-qr" /></div>
    <div className="widget-amount">Choose an amount <span>₹ INR</span></div>
    <div className="amount-chips">{config.amounts.map((item) => <button key={item} className={amount === item && !custom ? 'selected' : ''} onClick={() => { setAmount(item); setCustom('') }}>₹{item}</button>)}</div>
    <label className="widget-custom">Custom amount <span className="rupee-input"><i>₹</i><input inputMode="decimal" value={custom} onChange={(e) => setCustomValue(e.target.value)} placeholder="Enter amount" aria-label="Custom amount" /></span></label>
    {custom && !parseAmount(custom) && <p className="inline-error">Enter an amount from ₹0.01 to ₹100,000.</p>}
    <div className="widget-actions"><a className="pay-button" href={link || undefined} onClick={(e) => { if (custom && !parseAmount(custom) || activeAmount === null) { e.preventDefault(); setNotice('Choose a valid amount first.'); return } setNotice('Complete your payment in your UPI app. AppreciateU cannot confirm payment status.') }}><ArrowIcon /> Pay with UPI</a><button className="copy-link" onClick={() => { if (link) void copy(link); setNotice(link ? 'Payment link copied. Complete payment in your UPI app.' : 'Choose a valid amount first.') }} aria-label={copied ? 'Payment link copied' : 'Copy payment link'}>{copied ? '✓' : <CopyIcon />}</button></div>
    {notice && <p className="widget-note" role="status">{notice}</p>}
    <div className="powered">Payments happen directly in your UPI app</div>
  </section>
}

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [upi, setUpi] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('40')
  const [presets, setPresets] = useState('10, 20, 40, 100')
  const [qrColor, setQrColor] = useState('#172019')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [embedTheme, setEmbedTheme] = useState<'dark' | 'light'>('dark')
  const [accent, setAccent] = useState('#c6f36b')
  const [tab, setTab] = useState<'qr' | 'embed'>('qr')
  const [formError, setFormError] = useState('')
  const { copied, copy } = useCopy()
  useEffect(() => { const listener = () => setPath(window.location.pathname); window.addEventListener('popstate', listener); return () => window.removeEventListener('popstate', listener) }, [])
  const nav = (to: string) => { history.pushState({}, '', to); setPath(to); window.scrollTo(0, 0) }
  const selectedAmount = parseAmount(amount)
  const qrHasLowContrast = contrastRatio(qrColor, bgColor) < 3
  const payment = useMemo(() => validUpi(upi) && selectedAmount ? buildPaymentLink(upi, selectedAmount, name) : '', [upi, selectedAmount, name])
  const widgetConfig: WidgetConfig = { upi, name, amount: parseAmount(amount), amounts: presets.split(',').map((x) => parseAmount(x.trim())).filter((x): x is number => x !== null).slice(0, 6), theme: embedTheme, color: accent, cta: '' }
  const widgetUrl = useMemo(() => buildWidgetUrl(window.location.origin, { upi, name, amount, amounts: presets.replace(/\s/g, ''), theme: embedTheme, color: accent }), [upi, name, amount, presets, embedTheme, accent])
  const iframeCode = iframeMarkup(widgetUrl)
  const validate = () => { if (!validUpi(upi)) return 'Enter a UPI ID in the format name@bank.'; if (!parseAmount(amount)) return 'Enter an amount greater than ₹0 and no more than ₹100,000.'; return '' }
  const download = async (type: 'png' | 'svg') => {
    if (!payment) { setFormError(validate()); return }
    const blob = type === 'png'
      ? await QRCode.toDataURL(payment, { width: 1200, margin: 4, errorCorrectionLevel: 'H', color: { dark: qrColor, light: bgColor } }).then((data) => fetch(data).then((r) => r.blob()))
      : new Blob([await QRCode.toString(payment, { type: 'svg', width: 1200, margin: 4, errorCorrectionLevel: 'H', color: { dark: qrColor, light: bgColor } })], { type: 'image/svg+xml' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `appreciateu-upi.${type}`; a.click(); URL.revokeObjectURL(a.href)
  }
  if (path === '/embed') return <div className="embed-page"><Widget config={parseWidget(window.location.search)} /></div>
  if (path === '/privacy' || path === '/terms') return <div className="legal-page"><button className="brand" onClick={() => nav('/')}>appreciate<span>u</span><b>.</b></button><h1>{path === '/privacy' ? 'Privacy, plainly.' : 'Terms of use'}</h1><p>{path === '/privacy' ? 'AppreciateU runs in your browser. We do not create accounts, collect analytics, or store payment details. Your recipient UPI ID and display name appear in the generated QR, payment link, or widget URL and are visible to anyone who can access or share it. Your UPI app handles any payment directly.' : 'AppreciateU is a frontend utility for creating UPI payment links and QR codes. You are responsible for checking the recipient details before sharing or paying. UPI compatibility varies by app and device. AppreciateU does not process, verify, or guarantee payments.'}</p><button className="button secondary" onClick={() => nav('/')}><ArrowIcon direction="left" /> Back to AppreciateU</button></div>
  return <div className="site-shell">
    <header className="site-header"><button className="brand" onClick={() => nav('/')} aria-label="AppreciateU home">appreciate<span>u</span><b>.</b></button><nav><a href="#how">How it works</a><a href="#builder" onClick={() => setTab('embed')}>For your site</a><a className="open-source-link" href="https://github.com/harshilarora250/appreciate-u" target="_blank" rel="noopener noreferrer" aria-label="We're completely open source and on GitHub"><span className="open-source-desktop">Completely open source</span><span className="open-source-mobile">Open source</span><span className="open-source-host"> on GitHub</span><span className="external-mark" aria-hidden="true"><ArrowIcon /></span></a><button className="header-cta" onClick={() => { setTab('qr'); document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' }) }}><QRCodeIcon /> Make a QR</button></nav></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> A simpler way to say thanks</div><h1>Good work deserves<br/><em>a little more.</em></h1><p className="hero-text">Make it easy for people to show their appreciation. Create a UPI QR or add a tiny tipping widget to your site.</p><div className="hero-actions"><button className="button primary" onClick={() => { setTab('qr'); document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' }) }}><QRCodeIcon /> Create a QR code</button><button className="text-link" onClick={() => { setTab('embed'); document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' }) }}>Build an embed <ArrowIcon direction="right" /></button></div><div className="hero-footnote"><span className="tiny-check">✓</span> No account. No fees. Just UPI.</div></div><div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="float-note">made with <span>♥</span></div><div className="hero-widget"><Widget config={{ upi: 'thanks@okaxis', name: 'A little thank you', amount: 40, amounts: [20, 40, 100], theme: 'dark', color: '#c6f36b', cta: 'Send a little thanks' }} compact /></div><div className="float-stamp">✳ &nbsp; direct to UPI</div></div></section>
      <section className="trustline"><span>MADE FOR THE PEOPLE WHO MAKE YOUR DAY</span><div><b>creators</b><i>·</i><b>teachers</b><i>·</i><b>independent makers</b><i>·</i><b>everyday good humans</b></div></section>
      <section className="tool-section" id="tool"><div className="section-heading"><div className="eyebrow">THE APPRECIATEU TOOLKIT</div><h2>One small gesture.<br/><em>Two easy ways.</em></h2><p>Pick a QR for in-person thanks, or drop a widget wherever you share your work.</p></div><div className="tool-card"><div className="tool-tabs"><button className={tab === 'qr' ? 'active' : ''} onClick={() => setTab('qr')}><span><QRCodeIcon /></span> QR generator</button><button className={tab === 'embed' ? 'active' : ''} onClick={() => setTab('embed')}><span>⌘</span> Website widget <i>NEW</i></button><div className="tab-note"><span className="lock-icon">⌑</span> Works right in your browser</div></div>
        {tab === 'qr' ? <div className="tool-content"><div className="form-column"><div className="form-head"><span className="step">01</span><div><h3>Your details</h3><p>Where should the appreciation go?</p></div></div><label className="field-label">UPI ID <span className="required">Required</span><input value={upi} onChange={(e) => { setUpi(e.target.value); setFormError('') }} placeholder="yourname@bank" autoComplete="off" /></label><label className="field-label">DISPLAY NAME <span className="optional">Optional</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="How people know you" /></label><div className="field-row"><label className="field-label">AMOUNT (₹) <span className="optional">INR</span><div className="amount-entry"><span>₹</span><input inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setFormError('') }} /></div></label><div className="preset-select"><span>QUICK PICK</span><div>{[20, 40, 100].map((n) => <button className={amount === String(n) ? 'on' : ''} onClick={() => { setAmount(String(n)); setFormError('') }} key={n}>{n}</button>)}</div></div></div><details className="advanced"><summary>Fine tune your QR <span>＋</span></summary><div className="color-controls"><label>QR ink <input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} /></label><label>Paper <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} /></label><div className="qr-presets"><span>COLOR PRESETS</span><button onClick={() => { setQrColor('#172019'); setBgColor('#ffffff') }}>Ink on paper</button><button onClick={() => { setQrColor('#26351e'); setBgColor('#eff4e6') }}>Olive</button><button onClick={() => { setQrColor('#111511'); setBgColor('#e8edda') }}>Moss</button></div><p>High contrast works best. Keep the light margin around the code clear for reliable scanning.</p>{qrHasLowContrast && <p className="contrast-warning" role="status">Low contrast may make this code harder to scan. Choose a darker ink or lighter paper.</p>}</div></details>{formError && <p className="form-error" role="alert">{formError}</p>}<p className="privacy-note"><span>⌑</span> Your UPI ID stays in this browser until you share it.</p></div>
          <div className="preview-column" id="qr-output"><div className="preview-label"><span>LIVE PREVIEW</span><i><b/> {payment ? 'UPI DETAILS READY' : 'ADD YOUR DETAILS'}</i></div><div className="qr-paper"><div className="qr-kicker">A LITTLE THANK YOU</div><div className="qr-code-well"><QRImage value={payment} size={220} dark={qrColor} light={bgColor}/></div><div className="qr-recipient">{name || (upi || 'Your name here')}</div><div className="qr-caption">Scan to send a little something</div></div><div className="qr-actions"><button className="button dark-button" onClick={() => void download('png')}><DownloadIcon />PNG</button><button className="button outline-button" onClick={() => void download('svg')}><DownloadIcon />SVG</button><button className="button outline-button copy-payment copy-action" onClick={() => payment && void copy(payment)}>{copied ? '✓ Copied' : <><CopyIcon />Copy link</>}</button></div>{payment && <a className="open-upi" href={payment}>Open in a UPI app <ArrowIcon /></a>}</div></div> : <div className="embed-builder" id="builder"><div className="form-column"><div className="form-head"><span className="step">01</span><div><h3>Build your widget</h3><p>A tiny thank you button for your corner of the web.</p></div></div><label className="field-label">UPI ID <span className="required">Required</span><input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="yourname@bank" /></label><label className="field-label">DISPLAY NAME <span className="optional">Optional</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="How people know you" /></label><div className="field-row"><label className="field-label">STARTING AMOUNT (₹)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><label className="field-label">PRESET AMOUNTS<input value={presets} onChange={(e) => setPresets(e.target.value)} placeholder="10, 20, 40, 100" /><small>Comma-separated · up to 6</small></label></div><div className="field-row"><label className="field-label">WIDGET THEME<select value={embedTheme} onChange={(e) => setEmbedTheme(e.target.value as 'dark' | 'light')}><option value="dark">Midnight</option><option value="light">Paper</option></select></label><label className="field-label">ACCENT COLOR<input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label></div><div className="code-actions"><button className="button primary copy-action" onClick={() => void copy(iframeCode)}>{copied ? '✓ Copied!' : <><CopyIcon />Copy embed code</>}</button><button className="button outline-button copy-action" onClick={() => void copy(widgetUrl)}>{copied ? '✓ Copied!' : <><CopyIcon />Copy widget URL</>}</button></div><div className="code-box"><code>{iframeCode}</code></div><p className="privacy-note">Anyone with your widget URL can see your UPI ID and display name.</p></div><div className="embed-preview"><div className="preview-label"><span>LIVE PREVIEW</span><i><b/> 320 × 420</i></div><div className="iframe-wrap"><iframe title="Live UPI widget preview" src={widgetUrl} width="320" height="420" loading="lazy" /></div><div className="preview-url"><ArrowIcon /> &nbsp; Preview opens as a standalone widget</div></div></div>}
      </div></section>
      <section className="how-section" id="how"><div className="how-intro"><div className="eyebrow">THOUGHTFULLY SIMPLE</div><h2>Good things,<br/><em>without the fuss.</em></h2><p>There’s no middleman. Appreciation goes straight through the apps people already use.</p></div><div className="how-steps"><article><span>01</span><div className="step-icon">⌑</div><h3>Make it yours</h3><p>Add your UPI ID, a name, and the amounts that feel right.</p></article><article><span>02</span><div className="step-icon"><QRCodeIcon /></div><h3>Share your link</h3><p>Download a QR for your desk, or tuck the widget into your website.</p></article><article><span>03</span><div className="step-icon"><ArrowIcon /></div><h3>They say thanks</h3><p>Supporters complete payment in their own UPI app. That’s it.</p></article></div></section>
      <section className="closing"><div><span className="closing-flower">✳</span><h2>Make room for<br/><em>a little gratitude.</em></h2><p>Free to use. No account. No awkwardness.</p></div><button className="button primary" onClick={() => { setTab('qr'); document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth' }) }}><QRCodeIcon /> Make your first QR</button></section>
    </main><footer><button className="brand" onClick={() => nav('/')}>appreciate<span>u</span><b>.</b></button><span>Made for everyday good humans. &nbsp; Payments happen directly through UPI apps.</span><div><button onClick={() => nav('/privacy')}>Privacy</button><button onClick={() => nav('/terms')}>Terms</button><a href="mailto:hello@appreciateu.app">Say hello <ArrowIcon /></a></div></footer>
  </div>
}

export default App
