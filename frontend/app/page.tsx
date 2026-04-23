import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
      {/* Background */}
      <div className="orb orb-iris" style={{ top: '-100px', left: '-100px' }} />
      <div className="orb orb-aqua" style={{ bottom: '-100px', right: '-100px' }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(108,99,255,0.08) 0%, transparent 70%)',
      }} />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 720, width: '100%', textAlign: 'center' }}>
        {/* Badge */}
        <div className="animate-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', marginBottom: 28, background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.18)', borderRadius: 100 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'linear-gradient(135deg, var(--iris), var(--aqua))', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--iris-light)' }}>
            Multimodal AI Platform
          </span>
        </div>

        {/* Hero title */}
        <h1 className="animate-fade-up anim-delay-1" style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 800, lineHeight: 1.0, marginBottom: 24 }}>
          <span className="gradient-text">VISI</span>
          <br />
          <span style={{ fontSize: 28, fontWeight: 400, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
            Smart Video Intelligence
          </span>
        </h1>

        <p className="animate-fade-up anim-delay-2" style={{ color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 48px' }}>
          Upload any video. Our AI analyzes every frame, sound, and word — then helps you find or skip exactly what matters.
        </p>

        {/* CTA */}
        <div className="animate-fade-up anim-delay-3" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 80 }}>
          <Link href="/upload" className="btn-primary" style={{ padding: '15px 36px', fontSize: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Analyze a Video
          </Link>
          <a href="#features" className="btn-ghost" style={{ padding: '15px 28px', fontSize: 16 }}>
            How it works
          </a>
        </div>

        {/* Feature grid */}
        <div id="features" className="animate-fade-up anim-delay-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { icon: '🚫', title: 'Avoid Mode', desc: 'Auto-warns before violence, nudity, or disturbing audio with skip controls.', color: 'var(--danger)' },
            { icon: '🎯', title: 'Find Mode', desc: 'Highlights fight scenes, funny moments, emotional dialogues, action sequences.', color: 'var(--success)' },
            { icon: '👁️', title: 'Vision AI', desc: 'Frame-by-frame detection of blood, skin, motion blur, and scene composition.', color: 'var(--iris)' },
            { icon: '🎵', title: 'Audio Events', desc: 'Detects screams, explosions, gunshots, and laughter using spectral analysis.', color: 'var(--aqua)' },
            { icon: '💬', title: 'Speech NLP', desc: 'Whisper-powered transcription with BERT sentiment and abuse detection.', color: 'var(--amber)' },
            { icon: '🔀', title: 'Fusion Engine', desc: 'Combines vision + audio + text signals for high-accuracy scene tagging.', color: 'var(--iris-light)' },
          ].map((f) => (
            <div key={f.title} className="card" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 5, color: f.color }}>{f.title}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
