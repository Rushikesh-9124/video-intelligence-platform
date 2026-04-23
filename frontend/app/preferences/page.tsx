'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '../../utils/apiClient'

type Mode = 'avoid' | 'find'
type Sensitivity = 'low' | 'medium' | 'high'

interface Filters { violence: number; blood: number; nudity: number; abuse: number; horror: number }
interface AudioPrefs { detectAbusiveLanguage: boolean; detectScreaming: boolean; detectLoudNoises: boolean; detectEmotionalTone: boolean }

interface Prefs {
  mode: Mode
  sensitivity: Sensitivity
  filters: Filters
  audioPreferences: AudioPrefs
  naturalInput: string
}

function PreferencesForm() {
  const router = useRouter()
  const params = useSearchParams()
  const videoId = params.get('id') || ''

  const [prefs, setPrefs] = useState<Prefs>({
    mode: 'avoid',
    sensitivity: 'medium',
    filters: { violence: 3, blood: 3, nudity: 3, abuse: 3, horror: 3 },
    audioPreferences: { detectAbusiveLanguage: true, detectScreaming: true, detectLoudNoises: true, detectEmotionalTone: true },
    naturalInput: '',
  })
  const [saving, setSaving] = useState(false)
  const [parsedTags, setParsedTags] = useState<string[]>([])
  const [tagTimer, setTagTimer] = useState<NodeJS.Timeout | null>(null)

  // Debounce natural input parsing
  useEffect(() => {
    if (tagTimer) clearTimeout(tagTimer)
    if (!prefs.naturalInput.trim()) { setParsedTags([]); return }
    const t = setTimeout(() => {
      apiClient.parseIntent(prefs.naturalInput).then(setParsedTags).catch(() => {})
    }, 700)
    setTagTimer(t)
  }, [prefs.naturalInput])

  const updateFilter = (key: keyof Filters, val: number) =>
    setPrefs(p => ({ ...p, filters: { ...p.filters, [key]: val } }))

  const toggleAudio = (key: keyof AudioPrefs) =>
    setPrefs(p => ({ ...p, audioPreferences: { ...p.audioPreferences, [key]: !p.audioPreferences[key] } }))

  const handleAnalyze = async () => {
    setSaving(true)
    try {
      await apiClient.updatePreferences(videoId, prefs)
      await apiClient.startAnalysis(videoId)
      router.push(`/player?id=${videoId}`)
    } catch (err: any) {
      alert(err.message || 'Failed to start analysis')
      setSaving(false)
    }
  }

  const FILTER_CONFIG: { key: keyof Filters; label: string; icon: string; desc: string }[] = [
    { key: 'violence', label: 'Violence', icon: '⚔️', desc: 'Physical fights & brutal scenes' },
    { key: 'blood', label: 'Blood / Gore', icon: '🩸', desc: 'Graphic wounds and blood' },
    { key: 'nudity', label: 'Nudity', icon: '🔞', desc: 'Sexual or explicit content' },
    { key: 'abuse', label: 'Abusive Language', icon: '🗣️', desc: 'Profanity and verbal abuse' },
    { key: 'horror', label: 'Horror', icon: '👻', desc: 'Disturbing and scary imagery' },
  ]

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-16">
      <div className="orb orb-iris" style={{ top: '-100px', right: '-200px' }} />
      <div className="orb orb-aqua" style={{ bottom: '-100px', left: '-200px' }} />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-up">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, marginBottom: 10 }}>
            <span className="gradient-text">Configure</span> Analysis
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Tell the AI what you want to find or avoid.</p>
        </div>

        {/* Mode selector */}
        <div className="card animate-fade-up anim-delay-1" style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Mode
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              { val: 'avoid', icon: '🚫', label: 'Avoid Mode', desc: 'Warn & skip unwanted scenes', color: 'var(--danger)' },
              { val: 'find', icon: '🎯', label: 'Find Mode', desc: 'Highlight desired scenes', color: 'var(--success)' },
            ] as const).map(({ val, icon, label, desc, color }) => (
              <button
                key={val}
                onClick={() => setPrefs(p => ({ ...p, mode: val }))}
                style={{
                  padding: '16px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                  background: prefs.mode === val ? `rgba(${val === 'avoid' ? '255,77,109' : '0,229,160'}, 0.1)` : 'var(--glass-bg)',
                  border: `1px solid ${prefs.mode === val ? color : 'var(--glass-border)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 3, color: prefs.mode === val ? color : 'var(--text-primary)' }}>{label}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivity */}
        <div className="card animate-fade-up anim-delay-2" style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            Detection Sensitivity
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {(['low', 'medium', 'high'] as const).map(s => (
              <button
                key={s}
                onClick={() => setPrefs(p => ({ ...p, sensitivity: s }))}
                style={{
                  padding: '10px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                  background: prefs.sensitivity === s ? 'var(--iris-dim)' : 'var(--glass-bg)',
                  border: `1px solid ${prefs.sensitivity === s ? 'rgba(108,99,255,0.3)' : 'var(--glass-border)'}`,
                  color: prefs.sensitivity === s ? 'var(--iris-light)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  textTransform: 'capitalize', transition: 'all 0.15s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
            {prefs.sensitivity === 'high' ? '⚠️ High — catches more scenes, may have false positives'
              : prefs.sensitivity === 'low' ? '✅ Low — only flags clearly detected content'
              : '⚖️ Medium — balanced detection threshold'}
          </p>
        </div>

        {/* Filter sliders */}
        <div className="card animate-fade-up anim-delay-3" style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16 }}>
            Content Filters (0 = off, 5 = max)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FILTER_CONFIG.map(({ key, label, icon, desc }) => (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{label}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{desc}</p>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
                    color: prefs.filters[key] === 0 ? 'var(--text-muted)' : prefs.filters[key] >= 4 ? 'var(--danger)' : 'var(--iris-light)',
                    minWidth: 20, textAlign: 'right',
                  }}>
                    {prefs.filters[key]}
                  </span>
                </div>
                <input
                  type="range" min={0} max={5} step={1}
                  value={prefs.filters[key]}
                  onChange={(e) => updateFilter(key, +e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Audio toggles */}
        <div className="card animate-fade-up anim-delay-4" style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
            Audio Detection
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([
              { key: 'detectAbusiveLanguage', label: 'Abusive Language', icon: '🤬' },
              { key: 'detectScreaming', label: 'Screaming / Yelling', icon: '😱' },
              { key: 'detectLoudNoises', label: 'Loud Noises & Explosions', icon: '💥' },
              { key: 'detectEmotionalTone', label: 'Emotional Tone', icon: '😢' },
            ] as { key: keyof AudioPrefs; label: string; icon: string }[]).map(({ key, label, icon }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={prefs.audioPreferences[key]} onChange={() => toggleAudio(key)} />
                  <div className="toggle-track"><div className="toggle-thumb" /></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Natural language input */}
        <div className="card animate-fade-up anim-delay-5" style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Natural Language (optional)
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
            Describe what you want in plain English. AI will extract tags automatically.
          </p>
          <textarea
            className="input-field"
            rows={3}
            placeholder='e.g. "Show only fight scenes and emotional dialogues" or "Skip anything scary"'
            value={prefs.naturalInput}
            onChange={(e) => setPrefs(p => ({ ...p, naturalInput: e.target.value }))}
            style={{ resize: 'vertical', minHeight: 80 }}
          />
          {parsedTags.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 2 }}>Detected:</span>
              {parsedTags.map(t => (
                <span key={t} className="tag-find">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Analyze button */}
        <button
          className="btn-primary animate-fade-up"
          style={{ width: '100%', padding: '16px', fontSize: 16 }}
          disabled={saving}
          onClick={handleAnalyze}
        >
          {saving ? (
            <>
              <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin-slow 0.8s linear infinite' }} />
              Starting Analysis...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              Start AI Analysis
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: 40 }}>Loading...</div>}>
      <PreferencesForm />
    </Suspense>
  )
}
