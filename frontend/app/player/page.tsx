'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiClient } from '../../utils/apiClient'

interface Scene {
  start: number
  end: number
  tags: string[]
  source: string[]
  confidence: number
  thumbnail?: string
  transcript?: string
  sentiment?: string
}

interface VideoData {
  _id: string
  cloudinaryUrl: string
  title: string
  duration: number
  status: string
  preferences: { mode: 'avoid' | 'find'; sensitivity: string }
}

interface AnalysisData {
  status: string
  result: { scenes: Scene[] } | null
  preferences: { mode: 'avoid' | 'find' }
}

const AVOID_TAGS = new Set(['violence', 'fight', 'blood', 'gore', 'nudity', 'abuse', 'horror', 'scream', 'explosion'])

function PlayerContent() {
  const params = useSearchParams()
  const videoId = params.get('id') || ''
  const videoRef = useRef<HTMLVideoElement>(null)

  const [video, setVideo] = useState<VideoData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPopup, setShowPopup] = useState<Scene | null>(null)
  const [popupDismissed, setPopupDismissed] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [activeScene, setActiveScene] = useState<Scene | null>(null)
  const [showSceneList, setShowSceneList] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  const scenes = analysis?.result?.scenes || []
  const mode = analysis?.preferences?.mode || 'avoid'

  // ── Fetch video & analysis ────────────────────────────────────────────────
  useEffect(() => {
    if (!videoId) return
    const fetchData = async () => {
      try {
        const [vData, aData] = await Promise.all([
          apiClient.getVideo(videoId),
          apiClient.getAnalysis(videoId),
        ])
        setVideo(vData)
        setAnalysis(aData)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // Poll until analysis is done
    const poll = setInterval(async () => {
      const aData = await apiClient.getAnalysis(videoId).catch(() => null)
      if (!aData) return
      setAnalysis(aData)
      if (aData.status === 'completed' || aData.status === 'failed') clearInterval(poll)
    }, 3000)
    return () => clearInterval(poll)
  }, [videoId])

  // ── Scene popup logic ─────────────────────────────────────────────────────
  const checkPopup = useCallback(() => {
    if (mode !== 'avoid') return
    const v = videoRef.current
    if (!v) return
    const t = v.currentTime
    const upcoming = scenes.find(
      s => !popupDismissed.has(s.start) && t >= s.start - 3 && t < s.start && s.tags.some(tag => AVOID_TAGS.has(tag))
    )
    if (upcoming && !showPopup) {
      setShowPopup(upcoming)
    }
  }, [scenes, mode, popupDismissed, showPopup])

  // ── Find active scene ─────────────────────────────────────────────────────
  const updateActiveScene = useCallback((t: number) => {
    const sc = scenes.find(s => t >= s.start && t <= s.end) || null
    setActiveScene(sc)
  }, [scenes])

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    checkPopup()
    updateActiveScene(v.currentTime)
  }

  const skipScene = () => {
    if (!showPopup || !videoRef.current) return
    videoRef.current.currentTime = showPopup.end + 0.1
    setPopupDismissed(prev => new Set(prev).add(showPopup.start))
    setShowPopup(null)
  }

  const continueWatching = () => {
    if (!showPopup) return
    setPopupDismissed(prev => new Set(prev).add(showPopup.start))
    setShowPopup(null)
    videoRef.current?.play()
  }

  const jumpToScene = (scene: Scene) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = scene.start
    videoRef.current.play()
    setShowPopup(null)
    setShowSceneList(false)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    isPlaying ? v.pause() : v.play()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = +e.target.value
    if (videoRef.current) videoRef.current.currentTime = t
    setCurrentTime(t)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const relevantScenes = mode === 'avoid'
    ? scenes.filter(s => s.tags.some(t => AVOID_TAGS.has(t)))
    : scenes

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(108,99,255,0.2)', borderTopColor: 'var(--iris)', borderRadius: '50%', animation: 'spin-slow 1s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading video...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <div className="orb orb-iris" style={{ top: 0, left: '30%', opacity: 0.5 }} />

      {/* Top bar */}
      <div className="glass" style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 10 }}>
        <a href="/upload" style={{ color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {video?.title || 'Video'}
          </p>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 100,
          background: analysis?.status === 'completed' ? 'var(--success-dim)' : analysis?.status === 'processing' ? 'var(--iris-dim)' : 'var(--glass-bg)',
          border: `1px solid ${analysis?.status === 'completed' ? 'rgba(0,229,160,0.25)' : analysis?.status === 'processing' ? 'rgba(108,99,255,0.2)' : 'var(--glass-border)'}`,
        }}>
          {analysis?.status === 'processing' && (
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--iris)', animation: 'pulse-glow 1.5s ease infinite' }} />
          )}
          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em',
            color: analysis?.status === 'completed' ? 'var(--success)' : analysis?.status === 'processing' ? 'var(--iris-light)' : 'var(--text-muted)'
          }}>
            {analysis?.status || 'Loading'}
          </span>
        </div>

        {/* Mode badge */}
        <span className={mode === 'avoid' ? 'tag-avoid' : 'tag-find'}>
          {mode === 'avoid' ? '🚫 Avoid' : '🎯 Find'}
        </span>

        <button className="btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setShowSceneList(!showSceneList)}>
          {relevantScenes.length} Scenes
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 5 }}>
        {/* Video */}
        <div style={{ position: 'relative', background: '#000', flexShrink: 0 }}>
          <video
            ref={videoRef}
            src={video?.cloudinaryUrl}
            style={{ width: '100%', maxHeight: '60vh', display: 'block' }}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
          />

          {/* Warning overlay for avoid mode */}
          {showPopup && mode === 'avoid' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'fadeIn 0.3s ease',
              zIndex: 20,
            }}>
              <div className="card glass-strong" style={{ maxWidth: 380, width: '90%', textAlign: 'center', padding: '32px 28px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  Sensitive Content Ahead
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
                  {showPopup.tags.map(t => <span key={t} className="tag-avoid">{t}</span>)}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
                  Confidence: {Math.round(showPopup.confidence * 100)}% · {formatTime(showPopup.start)}–{formatTime(showPopup.end)}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-danger" style={{ flex: 1 }} onClick={skipScene}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                    Skip Scene
                  </button>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={continueWatching}>
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="glass" style={{ padding: '16px 20px' }}>
          {/* Timeline */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              type="range" min={0} max={duration || 100} step={0.1}
              value={currentTime}
              onChange={handleSeek}
              style={{ width: '100%', position: 'relative', zIndex: 2 }}
            />

            {/* Scene markers overlaid on timeline */}
            {duration > 0 && (
              <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 4, pointerEvents: 'none', zIndex: 1 }}>
                {relevantScenes.map((s, i) => {
                  const leftPct = (s.start / duration) * 100
                  const widthPct = ((s.end - s.start) / duration) * 100
                  const isAvoid = s.tags.some(t => AVOID_TAGS.has(t))
                  return (
                    <div
                      key={i}
                      title={s.tags.join(', ')}
                      style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 0.5)}%`,
                        height: 4,
                        borderRadius: 2,
                        background: mode === 'avoid' ? (isAvoid ? 'var(--danger)' : 'var(--success)') : 'var(--success)',
                        opacity: 0.85,
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Playback row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={togglePlay}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--iris), var(--aqua))',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isPlaying
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>

            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'monospace', flexShrink: 0 }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Active scene info */}
            {activeScene && (
              <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {activeScene.tags.slice(0, 3).map(t => (
                  <span key={t} className={activeScene.tags.some(x => AVOID_TAGS.has(x)) ? 'tag-avoid' : 'tag-find'}>{t}</span>
                ))}
              </div>
            )}

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <button
                onClick={() => { setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {isMuted
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                }
              </button>
              <input
                type="range" min={0} max={1} step={0.05} value={volume}
                onChange={(e) => { setVolume(+e.target.value); if (videoRef.current) videoRef.current.volume = +e.target.value }}
                style={{ width: 80 }}
              />
            </div>
          </div>
        </div>

        {/* Scene List Panel */}
        {showSceneList && (
          <div className="animate-fade-up" style={{ margin: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {relevantScenes.length === 0 ? (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                {analysis?.status === 'processing' ? '⏳ Analysis in progress...' : 'No scenes detected yet.'}
              </div>
            ) : relevantScenes.map((sc, i) => (
              <div key={i} className="card" style={{
                cursor: 'pointer', transition: 'all 0.2s',
                border: activeScene?.start === sc.start ? '1px solid rgba(108,99,255,0.4)' : 'var(--glass-border)',
              }}
                onClick={() => jumpToScene(sc)}
              >
                {sc.thumbnail ? (
                  <img src={`data:image/jpeg;base64,${sc.thumbnail}`} alt="scene" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 }} />
                ) : (
                  <div style={{ width: '100%', height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatTime(sc.start)} – {formatTime(sc.end)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {Math.round(sc.confidence * 100)}%
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: sc.transcript ? 8 : 0 }}>
                  {sc.tags.map(t => (
                    <span key={t} className={AVOID_TAGS.has(t) && mode === 'avoid' ? 'tag-avoid' : 'tag-find'}>{t}</span>
                  ))}
                  {sc.source.map(s => <span key={s} className="tag-neutral">{s}</span>)}
                </div>
                {sc.transcript && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    "{sc.transcript}"
                  </p>
                )}

                {/* Jump button */}
                <button className="btn-ghost" style={{ width: '100%', marginTop: 10, padding: '8px', fontSize: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 4 15 12 5 20 5 4"/></svg>
                  Jump to Scene
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Transcript / analysis processing notice */}
        {analysis?.status === 'processing' && (
          <div style={{ margin: '0 20px 20px', padding: '14px 16px', background: 'var(--iris-dim)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--iris)', animation: 'pulse-glow 1.5s ease infinite', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'var(--iris-light)' }}>
              AI is analyzing your video — scene markers will appear as processing completes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', padding: 40 }}>Loading...</div>}>
      <PlayerContent />
    </Suspense>
  )
}
