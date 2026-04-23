'use client'
import { apiClient } from '../../utils/apiClient'
import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

type UploadStep = 'idle' | 'dragging' | 'selected' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<UploadStep>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')

  const handleFile = (f: File) => {
    if (!f.type.startsWith('video/')) {
      setError('Please select a valid video file.')
      return
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('File too large. Maximum 500MB.')
      return
    }
    setFile(f)
    setTitle(f.name.replace(/\.[^.]+$/, ''))
    setStep('selected')
    setError('')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setStep('idle')
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const handleUpload = async () => {
    if (!file) return

    setStep('uploading')
    setProgress(0)

    try {
      const preferences = {
        mode: 'avoid',
        sensitivity: 'medium',
        filters: {
          violence: 3,
          blood: 3,
          nudity: 3,
          abuse: 3,
          horror: 3,
        },
        audioPreferences: {
          detectAbusiveLanguage: true,
          detectScreaming: true,
          detectLoudNoises: true,
          detectEmotionalTone: true,
        },
        naturalInput: '',
      }

      const formData = new FormData()
      formData.append('video', file)
      formData.append('title', title)
      formData.append('preferences', JSON.stringify(preferences))

      const { videoId } = await apiClient.uploadVideo(
        formData,
        (pct: number) => setProgress(pct)
      )

      setStep('done')

      setTimeout(() => {
        router.push(`/preferences?id=${videoId}`)
      }, 800)

    } catch (err: any) {
      setStep('error')
      setError(err.message || 'Upload failed')
    }
  }

  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-16">
      {/* Background orbs */}
      <div className="orb orb-iris" style={{ top: '-200px', left: '-200px' }} />
      <div className="orb orb-aqua" style={{ bottom: '-150px', right: '-100px' }} />

      {/* Noise texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E")`,
        opacity: 0.4,
      }} />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', marginBottom: 20,
            background: 'rgba(108, 99, 255, 0.1)',
            border: '1px solid rgba(108, 99, 255, 0.2)',
            borderRadius: 100,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--iris)', display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--iris-light)', textTransform: 'uppercase' }}>
              AI Video Intelligence
            </span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
            <span className="gradient-text">Analyze</span>
            <br />
            <span style={{ color: 'var(--text-secondary)' }}>your video</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 420, margin: '0 auto' }}>
            Upload a video and our AI detects, tags, and highlights scenes — violence, humor, emotion, action, and more.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          className={`card animate-fade-up anim-delay-2`}
          style={{
            padding: 0, overflow: 'hidden', cursor: 'pointer',
            border: step === 'dragging'
              ? '2px dashed rgba(108, 99, 255, 0.6)'
              : step === 'selected' || step === 'uploading' || step === 'done'
                ? '1px solid rgba(108, 99, 255, 0.3)'
                : '2px dashed rgba(255,255,255,0.1)',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onDragOver={(e) => { e.preventDefault(); setStep('dragging') }}
          onDragLeave={() => setStep(file ? 'selected' : 'idle')}
          onDrop={handleDrop}
          onClick={() => step === 'idle' && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {/* Idle state */}
          {(step === 'idle' || step === 'dragging') && (
            <div style={{ padding: '56px 32px', textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: step === 'dragging' ? 'rgba(108, 99, 255, 0.2)' : 'var(--glass-bg)',
                border: '1px solid',
                borderColor: step === 'dragging' ? 'rgba(108, 99, 255, 0.4)' : 'var(--glass-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                transition: 'all 0.2s',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={step === 'dragging' ? 'var(--iris)' : 'var(--text-secondary)'} strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 8, color: step === 'dragging' ? 'var(--iris-light)' : 'var(--text-primary)' }}>
                {step === 'dragging' ? 'Drop to upload' : 'Drag & drop your video'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>or click to browse · MP4, WebM, AVI, MOV up to 500MB</p>
            </div>
          )}

          {/* File selected */}
          {step === 'selected' && file && (
            <div style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--iris-dim)', border: '1px solid rgba(108,99,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--iris-light)" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{formatBytes(file.size)}</p>
                </div>
                <button className="btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setFile(null); setStep('idle') }}>
                  Change
                </button>
              </div>

              {/* Title input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Video Title
                </label>
                <input
                  className="input-field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title..."
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <button className="btn-primary" style={{ width: '100%' }} onClick={(e) => { e.stopPropagation(); handleUpload() }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload & Continue
              </button>
            </div>
          )}

          {/* Uploading */}
          {step === 'uploading' && (
            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56,
                  border: '3px solid rgba(108,99,255,0.15)',
                  borderTopColor: 'var(--iris)',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin-slow 1s linear infinite',
                }} />
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Uploading to cloud...</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{progress}% complete</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 100,
                  background: 'linear-gradient(90deg, var(--iris), var(--aqua))',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--success-dim)', border: '1px solid rgba(0,229,160,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Upload complete! Redirecting...</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="animate-fade-up" style={{
            marginTop: 16, padding: '12px 16px',
            background: 'var(--danger-dim)',
            border: '1px solid rgba(255,77,109,0.2)',
            borderRadius: 12,
            color: 'var(--danger)',
            fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Feature grid */}
        <div className="animate-fade-up anim-delay-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 40 }}>
          {[
            { icon: '👁️', label: 'Visual AI', desc: 'Frame-by-frame analysis' },
            { icon: '🎵', label: 'Audio Events', desc: 'Screams, explosions & more' },
            { icon: '💬', label: 'Speech NLP', desc: 'Transcript sentiment' },
          ].map((f) => (
            <div key={f.label} className="card" style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{f.label}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
