'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trainsApi } from '@/lib/api'
import '@/app/marketing.css'

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'map' | 'agent' | 'pwa'>('map')
  const [activeFlowStep, setActiveFlowStep] = useState<number>(0)

  const [searchTab, setSearchTab] = useState<'train' | 'pnr'>('train')
  const [trainQuery, setTrainQuery] = useState('')
  const [pnrQuery, setPnrQuery] = useState('')
  const [searchError, setSearchError] = useState('')
  const [liveTrainsCount, setLiveTrainsCount] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)

  function handleTrainSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trainQuery.trim()) return
    router.push(`/track?train=${encodeURIComponent(trainQuery.trim())}`)
  }

  function handlePnrSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = pnrQuery.trim()
    if (!trimmed) return
    if (trimmed.length !== 10) {
      setSearchError('PNR number must be 10 digits')
      return
    }
    router.push(`/track/pnr?pnr=${trimmed}`)
  }

  // Fetch live active trains count & user session
  useEffect(() => {
    const stored = localStorage.getItem('railsense_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch (err) {
        console.error(err)
      }
    }

    async function fetchLiveStats() {
      try {
        const res = await trainsApi.getAll()
        if (res.data && Array.isArray(res.data)) {
          setLiveTrainsCount(res.data.length)
        }
      } catch (err) {
        console.error('Failed to fetch live stats for landing page:', err)
      }
    }
    fetchLiveStats()
  }, [])
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const flowDiagramRef = useRef<HTMLDivElement | null>(null)

  // Scroll handler for navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let W = (canvas.width = canvas.offsetWidth)
    let H = (canvas.height = canvas.offsetHeight)

    const handleResize = () => {
      if (!canvas) return
      W = canvas.width = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
      initParticles()
    }
    window.addEventListener('resize', handleResize)

    class Particle {
      x!: number
      y!: number
      size!: number
      alpha!: number
      speed!: number
      dx!: number
      dy!: number
      pulse!: number

      constructor() {
        this.reset()
      }

      reset() {
        this.x = Math.random() * W
        this.y = Math.random() * H
        this.size = Math.random() * 1.5 + 0.3
        this.alpha = Math.random() * 0.4 + 0.05
        this.speed = Math.random() * 0.3 + 0.05
        this.dx = (Math.random() - 0.5) * 0.4
        this.dy = -this.speed
        this.pulse = Math.random() * Math.PI * 2
      }

      update() {
        this.x += this.dx
        this.y += this.dy
        this.pulse += 0.02
        this.alpha = Math.sin(this.pulse) * 0.15 + 0.12
        if (this.y < -10 || this.x < -10 || this.x > W + 10) {
          this.reset()
        }
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232, 33, 59, ${this.alpha})`
        ctx.fill()
      }
    }

    let particles: Particle[] = []

    function initParticles() {
      particles = []
      for (let i = 0; i < 120; i++) {
        particles.push(new Particle())
      }
    }

    function drawGrid() {
      if (!ctx) return
      ctx.strokeStyle = 'rgba(240, 244, 255, 0.018)'
      ctx.lineWidth = 1
      const gridSize = 60
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
    }

    function drawConnections() {
      if (!ctx) return
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 80) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(232, 33, 59, ${0.04 * (1 - dist / 80)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    function animate() {
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      drawGrid()
      drawConnections()
      particles.forEach((p) => {
        p.update()
        p.draw()
      })
      animationFrameId = requestAnimationFrame(animate)
    }

    initParticles()
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // Reveal animations via IntersectionObserver
  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal')
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const siblings = Array.from(
              entry.target.parentElement?.querySelectorAll('.reveal') || []
            )
            const idx = siblings.indexOf(entry.target)
            setTimeout(() => {
              entry.target.classList.add('visible')
            }, idx * 80)
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    revealEls.forEach((el) => revealObserver.observe(el))
    return () => revealObserver.disconnect()
  }, [])

  // Flow Step diagram timer
  useEffect(() => {
    let stepInterval: NodeJS.Timeout
    const flowDiagram = flowDiagramRef.current
    if (!flowDiagram) return

    const flowObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveFlowStep(0)
            clearInterval(stepInterval)
            stepInterval = setInterval(() => {
              setActiveFlowStep((prev) => (prev + 1) % 7)
            }, 900)
          } else {
            clearInterval(stepInterval)
          }
        })
      },
      { threshold: 0.3 }
    )

    flowObserver.observe(flowDiagram)
    return () => {
      clearInterval(stepInterval)
      flowObserver.disconnect()
    }
  }, [])



  return (
    <div className="marketing-page">
      {/* TOP TICKER */}
      <div className="ticker-bar" id="ticker-bar">
        <div className="ticker-content">
          <span className="ticker-icon">🚆</span>
          <div className="ticker-track">
            <div className="ticker-text">
              Tracking 13,000+ trains across India in real-time &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
              Tracking 13,000+ trains across India in real-time &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
              Tracking 13,000+ trains across India in real-time &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
              Tracking 13,000+ trains across India in real-time &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
            </div>
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="6" fill="#E8213B"/>
              <path d="M6 14h16M6 10h16M6 18h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="14" cy="22" r="2" fill="white"/>
              <circle cx="8" cy="22" r="2" fill="white"/>
              <circle cx="20" cy="22" r="2" fill="white"/>
            </svg>
            <span className="logo-text">Rail<span className="logo-accent">Sense</span></span>
            <span className="live-badge">
              <span className="live-dot"></span>
              LIVE
            </span>
          </div>
          <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} id="nav-links">
            <a href="#problem" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Problem</a>
            <a href="#solution" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Solution</a>
            <a href="#how-it-works" className="nav-link" onClick={() => setMobileMenuOpen(false)}>How It Works</a>

            {user ? (
              <>
                <Link
                  href={user.role === 'STATION_MASTER' ? '/dashboard' : '/track'}
                  className="nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {user.role === 'STATION_MASTER' ? 'Dashboard' : 'Console'}
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('railsense_token')
                    localStorage.removeItem('railsense_user')
                    setUser(null)
                    setMobileMenuOpen(false)
                    window.location.reload()
                  }}
                  className="nav-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: 'auto', padding: 0 }}
                >
                  Logout
                </button>
                <Link
                  href={user.role === 'STATION_MASTER' ? '/dashboard' : '/track'}
                  className="nav-link nav-cta"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Go to Console
                </Link>
              </>
            ) : (
              <Link href="/login" className="nav-link nav-cta" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            )}
          </div>
          <button 
            className={`nav-toggle ${mobileMenuOpen ? 'active' : ''}`} 
            id="nav-toggle" 
            aria-label="Toggle navigation"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero" id="home">
        <canvas className="hero-canvas" id="hero-canvas" ref={canvasRef}></canvas>
        <div className="hero-india-map">
          <svg id="india-svg" viewBox="0 0 400 480" xmlns="http://www.w3.org/2000/svg" opacity="0.06">
            <path d="M160,20 L180,18 L210,22 L240,20 L260,30 L280,25 L300,40 L310,60 L320,80 L330,100 L340,130 L345,160 L340,190 L330,210 L320,230 L310,255 L300,275 L285,295 L270,315 L255,335 L240,355 L225,375 L215,395 L210,415 L215,440 L220,460 L215,475 L205,465 L200,445 L195,420 L188,400 L175,378 L160,358 L145,338 L128,315 L110,295 L95,272 L80,248 L70,222 L60,195 L55,168 L52,140 L55,112 L60,88 L70,68 L85,50 L105,35 L130,25 Z" fill="none" stroke="#E8213B" strokeWidth="1.5"/>
            <path d="M215,475 L218,470 L222,455 L225,435 L228,420 L232,405 L235,390 L230,378 L222,368 L215,360 L210,350" fill="none" stroke="#E8213B" strokeWidth="1" opacity="0.6"/>
            <circle cx="200" cy="120" r="3" fill="#E8213B" opacity="0.8"/>
            <circle cx="150" cy="180" r="2.5" fill="#F59E0B" opacity="0.7"/>
            <circle cx="260" cy="160" r="2.5" fill="#E8213B" opacity="0.6"/>
            <circle cx="180" cy="250" r="3" fill="#F59E0B" opacity="0.8"/>
            <circle cx="230" cy="300" r="2" fill="#E8213B" opacity="0.5"/>
            <circle cx="140" cy="290" r="2.5" fill="#F59E0B" opacity="0.6"/>
            <circle cx="210" cy="370" r="2" fill="#E8213B" opacity="0.7"/>
          </svg>
        </div>

        {/* Route line animation */}
        <div className="route-line-container">
          <svg className="route-svg" viewBox="0 0 1400 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path id="route-path" d="M-50,50 Q100,20 200,50 Q350,80 500,45 Q650,10 800,50 Q950,85 1100,42 Q1250,5 1450,50" fill="none" stroke="url(#routeGrad)" strokeWidth="2" strokeDasharray="8 6"/>
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E8213B" stopOpacity="0"/>
                <stop offset="30%" stopColor="#E8213B" stopOpacity="0.8"/>
                <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <g id="train-mover">
              <rect x="-12" y="-6" width="24" height="12" rx="3" fill="#E8213B"/>
              <circle cx="-6" cy="7" r="3" fill="#F59E0B"/>
              <circle cx="6" cy="7" r="3" fill="#F59E0B"/>
              <rect x="-8" y="-4" width="6" height="5" rx="1" fill="rgba(255,255,255,0.3)"/>
              <rect x="2" y="-4" width="6" height="5" rx="1" fill="rgba(255,255,255,0.3)"/>
            </g>
          </svg>
        </div>

        <div className="hero-content">
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              FAR AWAY 2026 — India's Biggest International Hackathon
            </div>
            {liveTrainsCount !== null && (
              <div className="hero-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10B981' }}>
                <span className="badge-dot" style={{ backgroundColor: '#10B981' }}></span>
                {liveTrainsCount} Live Trains Connected
              </div>
            )}
          </div>
          <h1 className="hero-title">
            India's Railway,<br/>
            <span className="gradient-text">Finally Intelligent.</span>
          </h1>
          <p className="hero-subtitle">
            RailSense tracks every train in real-time, predicts cascade delays<br className="desktop-break"/>
            before they happen, and keeps <strong>23 million daily passengers</strong> informed.
          </p>
          <p className="hero-subtagline">Real-time tracking. AI-powered operations. Zero delays left unexplained.</p>

          {/* Live Search Widget */}
          <div className="search-widget-container" style={{
            maxWidth: '460px',
            width: '100%',
            margin: '2rem auto 2.5rem',
            backgroundColor: 'rgba(13, 27, 46, 0.65)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #1E3A5F',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            textAlign: 'left',
            position: 'relative',
            zIndex: 20
          }}>
            <div className="flex" style={{ borderBottom: '1px solid #1E3A5F', marginBottom: '1rem' }}>
              <button
                type="button"
                className="flex-1"
                style={{
                  paddingBottom: '0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: 'transparent',
                  color: searchTab === 'train' ? '#F0F4FF' : '#a0aec0',
                  border: 'none',
                  borderBottom: searchTab === 'train' ? '2px solid #E8213B' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  marginBottom: '-1px'
                }}
                onClick={() => { setSearchTab('train'); setSearchError(''); }}
              >
                Live Train Status
              </button>
              <button
                type="button"
                className="flex-1"
                style={{
                  paddingBottom: '0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: 'transparent',
                  color: searchTab === 'pnr' ? '#F0F4FF' : '#a0aec0',
                  border: 'none',
                  borderBottom: searchTab === 'pnr' ? '2px solid #E8213B' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  marginBottom: '-1px'
                }}
                onClick={() => { setSearchTab('pnr'); setSearchError(''); }}
              >
                PNR Telemetry Check
              </button>
            </div>

            {searchTab === 'train' ? (
              <form onSubmit={handleTrainSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(240,244,255,0.4)', letterSpacing: '0.05em' }}>Train Number or Name</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="e.g. 12951 or Rajdhani"
                      value={trainQuery}
                      onChange={(e) => setTrainQuery(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: '#060E1A',
                        border: '1px solid #1E3A5F',
                        borderRadius: '8px',
                        padding: '0.6rem 0.8rem',
                        fontSize: '0.875rem',
                        color: '#F0F4FF',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#E8213B',
                        color: 'white',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 1.25rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      Search
                    </button>
                  </div>
                </div>
                {searchError && <p style={{ fontSize: '11px', color: '#E8213B', fontWeight: 600, margin: 0 }}>{searchError}</p>}
                <div style={{ fontSize: '10px', color: 'rgba(240,244,255,0.4)' }}>
                  Try seeded: <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#F0F4FF' }} onClick={() => setTrainQuery('12951')}>12951 (Mumbai Rajdhani)</span> or <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#F0F4FF' }} onClick={() => setTrainQuery('12301')}>12301</span>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePnrSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(240,244,255,0.4)', letterSpacing: '0.05em' }}>10-Digit PNR Number</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 1295100001"
                      value={pnrQuery}
                      onChange={(e) => setPnrQuery(e.target.value.replace(/\D/g, ''))}
                      style={{
                        flex: 1,
                        backgroundColor: '#060E1A',
                        border: '1px solid #1E3A5F',
                        borderRadius: '8px',
                        padding: '0.6rem 0.8rem',
                        fontSize: '0.875rem',
                        color: '#F0F4FF',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#E8213B',
                        color: 'white',
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 1.25rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      Check PNR
                    </button>
                  </div>
                </div>
                {searchError && <p style={{ fontSize: '11px', color: '#E8213B', fontWeight: 600, margin: 0 }}>{searchError}</p>}
                <div style={{ fontSize: '10px', color: 'rgba(240,244,255,0.4)' }}>
                  Try seeded PNRs: <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#F0F4FF' }} onClick={() => setPnrQuery('1295100001')}>1295100001</span> or <span style={{ textDecoration: 'underline', cursor: 'pointer', color: '#F0F4FF' }} onClick={() => setPnrQuery('1230100001')}>1230100001</span>
                </div>
              </form>
            )}
          </div>

          <div className="hero-ctas">
            {user ? (
              <Link
                href={user.role === 'STATION_MASTER' ? '/dashboard' : '/track'}
                className="btn-primary"
                id="see-demo-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
                Go to Console
              </Link>
            ) : (
              <Link href="/login" className="btn-primary" id="see-demo-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13 12H3"/></svg>
                Login to Console
              </Link>
            )}
            <a href="#how-it-works" className="btn-outline" id="how-it-works-btn">
              How It Works
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-num">13,000+</span>
              <span className="stat-label">Trains Tracked</span>
            </div>
            <div className="hero-divider"></div>
            <div className="hero-stat">
              <span className="stat-num">23M+</span>
              <span className="stat-label">Daily Passengers</span>
            </div>
            <div className="hero-divider"></div>
            <div className="hero-stat">
              <span className="stat-num">30s</span>
              <span className="stat-label">Agent Refresh</span>
            </div>
          </div>
        </div>

        <div className="hero-scroll-hint">
          <span>Scroll to explore</span>
          <div className="scroll-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M12 5v14M5 12l7 7-7 7"/></svg>
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section className="problem-section section" id="problem">
        <div className="container">
          <div className="section-eyebrow reveal">THE CHALLENGE</div>
          <h2 className="section-title reveal">Indian Railways.<br/><span className="gradient-text-amber">13,000 trains. Zero real-time visibility.</span></h2>
          <p className="section-subtitle reveal">The world's largest railway network runs on outdated systems. Passengers are left in the dark. Operations are reactive, not predictive.</p>
          <div className="problem-cards">
            <div className="problem-card reveal" id="problem-card-1">
              <div className="problem-card-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8213B" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="problem-card-num">01</div>
              <h3>Outdated Information Systems</h3>
              <p>NTES is outdated. Passengers find out about delays on the platform — not 30 minutes before, not via their phone. <em>On the platform, after it's too late.</em></p>
              <div className="problem-card-tag">UX Failure</div>
            </div>
            <div className="problem-card reveal" id="problem-card-2">
              <div className="problem-card-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8213B" strokeWidth="1.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div className="problem-card-num">02</div>
              <h3>Invisible Cascade Delays</h3>
              <p>Cascade delays go undetected until it's too late to act. One delayed train triggers a domino effect — and no system catches it early enough to intervene.</p>
              <div className="problem-card-tag">Operational Blindspot</div>
            </div>
            <div className="problem-card reveal" id="problem-card-3">
              <div className="problem-card-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E8213B" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M8.46 8.46a5 5 0 0 0 0 7.07"/>
                </svg>
              </div>
              <div className="problem-card-num">03</div>
              <h3>Manual Operations Decisions</h3>
              <p>Station masters make rerouting decisions manually, with no AI assist. Critical choices affecting thousands of passengers are made with incomplete, stale data.</p>
              <div className="problem-card-tag">Human Bottleneck</div>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section className="solution-section section" id="solution">
        <div className="container">
          <div className="section-eyebrow reveal">THE SOLUTION</div>
          <h2 className="section-title reveal">One Platform.<br/><span className="gradient-text">Three Powerful Panels.</span></h2>
          <p className="section-subtitle reveal">RailSense unifies real-time tracking, AI operations, and passenger communication into a single, seamless system.</p>

          <div className="solution-tabs">
            <div className="tab-buttons reveal">
              <button 
                className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} 
                onClick={() => setActiveTab('map')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                Live Train Map
              </button>
              <button 
                className={`tab-btn ${activeTab === 'agent' ? 'active' : ''}`}
                onClick={() => setActiveTab('agent')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>
                AI Operations Agent
              </button>
              <button 
                className={`tab-btn ${activeTab === 'pwa' ? 'active' : ''}`}
                onClick={() => setActiveTab('pwa')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                Passenger PWA
              </button>
            </div>

            <div className="tab-content-wrapper reveal">
              {/* Tab: Map */}
              <div className={`tab-panel ${activeTab === 'map' ? 'active' : ''}`} id="tab-map">
                <div className="tab-visual">
                  <div className="mini-map-mockup">
                    <div className="map-header">
                      <div className="map-header-left">
                        <div className="map-dot red"></div>
                        <div className="map-dot yellow"></div>
                        <div className="map-dot green"></div>
                      </div>
                      <span>RailSense — Live Train Map</span>
                      <div className="map-live-badge"><span className="pulse-dot"></span>LIVE</div>
                    </div>
                    <div className="map-body">
                      <svg viewBox="0 0 380 280" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                        <path d="M140,15 L160,12 L185,16 L210,14 L228,22 L245,18 L262,30 L272,48 L282,68 L290,92 L295,118 L293,145 L287,168 L278,188 L268,208 L255,228 L240,248 L227,265 L220,272 L215,260 L210,240 L204,220 L195,200 L182,180 L167,162 L150,145 L133,125 L118,105 L105,83 L96,62 L90,42 L98,28 L115,18 Z" fill="rgba(8,20,45,0.8)" stroke="rgba(232,33,59,0.15)" strokeWidth="1"/>
                        <line x1="0" y1="70" x2="380" y2="70" stroke="rgba(240,244,255,0.03)" strokeWidth="1"/>
                        <line x1="0" y1="140" x2="380" y2="140" stroke="rgba(240,244,255,0.03)" strokeWidth="1"/>
                        <line x1="0" y1="210" x2="380" y2="210" stroke="rgba(240,244,255,0.03)" strokeWidth="1"/>
                        <line x1="95" y1="0" x2="95" y2="280" stroke="rgba(240,244,255,0.03)" strokeWidth="1"/>
                        <line x1="190" y1="0" x2="190" y2="280" stroke="rgba(240,244,255,0.03)" strokeWidth="1"/>
                        <line x1="285" y1="0" x2="285" y2="280" stroke="rgba(240,244,255,0.03)" strokeWidth="1"/>
                        <path d="M150,40 Q190,90 230,130 Q250,160 235,200" fill="none" stroke="rgba(232,33,59,0.3)" strokeWidth="1.5" strokeDasharray="4 3"/>
                        <path d="M110,80 Q155,120 170,170 Q175,200 190,230" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="1.5" strokeDasharray="4 3"/>
                        <path d="M200,30 Q215,100 210,160 Q205,200 215,250" fill="none" stroke="rgba(232,33,59,0.2)" strokeWidth="1" strokeDasharray="3 4"/>
                        <g className="train-dot-group">
                          <circle cx="175" cy="75" r="5" fill="#E8213B" opacity="0.9"/>
                          <circle cx="175" cy="75" r="10" fill="#E8213B" opacity="0.2">
                            <animate attributeName="r" values="5;15;5" dur="2s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite"/>
                          </circle>
                        </g>
                        <g className="train-dot-group">
                          <circle cx="145" cy="140" r="4" fill="#F59E0B" opacity="0.9"/>
                          <circle cx="145" cy="140" r="8" fill="#F59E0B" opacity="0.2">
                            <animate attributeName="r" values="4;12;4" dur="2.5s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite"/>
                          </circle>
                        </g>
                        <g className="train-dot-group">
                          <circle cx="220" cy="100" r="4" fill="#E8213B" opacity="0.8"/>
                          <circle cx="220" cy="100" r="8" fill="#E8213B" opacity="0.15">
                            <animate attributeName="r" values="4;13;4" dur="3s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.25;0;0.25" dur="3s" repeatCount="indefinite"/>
                          </circle>
                        </g>
                        <g className="train-dot-group">
                          <circle cx="195" cy="185" r="4" fill="#F59E0B" opacity="0.7"/>
                          <circle cx="195" cy="185" r="8" fill="#F59E0B" opacity="0.15">
                            <animate attributeName="r" values="4;11;4" dur="2.2s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.25;0;0.25" dur="2.2s" repeatCount="indefinite"/>
                          </circle>
                        </g>
                        <g className="train-dot-group">
                          <circle cx="165" cy="220" r="3.5" fill="#E8213B" opacity="0.8"/>
                          <circle cx="165" cy="220" r="7" fill="#E8213B" opacity="0.15">
                            <animate attributeName="r" values="3.5;11;3.5" dur="1.8s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.25;0;0.25" dur="1.8s" repeatCount="indefinite"/>
                          </circle>
                        </g>
                        <text x="158" y="38" fill="rgba(240,244,255,0.4)" fontSize="7" fontFamily="Inter">Delhi</text>
                        <text x="215" y="92" fill="rgba(240,244,255,0.4)" fontSize="7" fontFamily="Inter">Kolkata</text>
                        <text x="130" y="135" fill="rgba(240,244,255,0.4)" fontSize="7" fontFamily="Inter">Mumbai</text>
                        <text x="178" y="230" fill="rgba(240,244,255,0.4)" fontSize="7" fontFamily="Inter">Chennai</text>
                        <g transform="translate(185, 60)">
                          <rect x="0" y="0" width="110" height="58" rx="6" fill="rgba(10,22,40,0.95)" stroke="rgba(232,33,59,0.4)" strokeWidth="1"/>
                          <text x="8" y="14" fill="#E8213B" fontSize="7" fontFamily="Inter" fontWeight="600">12951 — RAJDHANI EXP</text>
                          <text x="8" y="26" fill="rgba(240,244,255,0.7)" fontSize="6.5" fontFamily="Inter">Speed: 112 km/h</text>
                          <text x="8" y="38" fill="rgba(240,244,255,0.7)" fontSize="6.5" fontFamily="Inter">Delay: +0 min</text>
                          <text x="8" y="50" fill="#F59E0B" fontSize="6.5" fontFamily="Inter">Next: Surat — ETA 14:32</text>
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="tab-info">
                  <div className="tab-icon-large">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8213B" strokeWidth="1.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                  </div>
                  <h3>Live Train Map</h3>
                  <p>Every train in India, tracked in real-time on an interactive map. Click any train for live position, speed, delay status and next stop ETA.</p>
                  <ul className="feature-list">
                    <li><span className="check-icon">✦</span> Real-time GPS position updates every 30 seconds</li>
                    <li><span className="check-icon">✦</span> Route path highlighted with delay heatmap</li>
                    <li><span className="check-icon">✦</span> Platform conflict detection overlaid on map</li>
                    <li><span className="check-icon">✦</span> Click any train — speed, delay, next stop ETA</li>
                  </ul>
                </div>
              </div>

              {/* Tab: Agent */}
              <div className={`tab-panel ${activeTab === 'agent' ? 'active' : ''}`} id="tab-agent">
                <div className="tab-visual">
                  <div className="agent-mockup">
                    <div className="map-header">
                      <div className="map-header-left">
                        <div className="map-dot red"></div>
                        <div className="map-dot yellow"></div>
                        <div className="map-dot green"></div>
                      </div>
                      <span>RailSense — AI Operations Agent</span>
                      <div className="map-live-badge"><span className="pulse-dot"></span>ACTIVE</div>
                    </div>
                    <div className="agent-body">
                      <div className="agent-log">
                        <div className="log-entry">
                          <span className="log-time">14:23:01</span>
                          <span className="log-type info">INFO</span>
                          <span className="log-msg">Fetching train data... 13,247 active trains</span>
                        </div>
                        <div className="log-entry">
                          <span className="log-time">14:23:03</span>
                          <span className="log-type warn">WARN</span>
                          <span className="log-msg">12028 SHATABDI — Platform conflict at Pune Jn.</span>
                        </div>
                        <div className="log-entry">
                          <span className="log-time">14:23:04</span>
                          <span className="log-type critical">ALERT</span>
                          <span className="log-msg">Cascade delay predicted — 3 downstream trains at risk</span>
                        </div>
                        <div className="log-entry">
                          <span className="log-time">14:23:05</span>
                          <span className="log-type ai">AI</span>
                          <span className="log-msg">Claude reasoning: Reroute via Platform 4 — ETA saved +12 min</span>
                        </div>
                        <div className="log-entry">
                          <span className="log-time">14:23:07</span>
                          <span className="log-type info">INFO</span>
                          <span className="log-msg">Auto-announcement drafted (Hindi + English)</span>
                        </div>
                        <div className="log-entry">
                          <span className="log-time">14:23:08</span>
                          <span className="log-type success">DONE</span>
                          <span className="log-msg">1,243 passengers notified via PWA push alerts</span>
                        </div>
                        <div className="log-entry active-entry">
                          <span className="log-time">14:23:30</span>
                          <span className="log-type info">INFO</span>
                          <span className="log-msg">Next cycle in 30s... <span className="blink-cursor">|</span></span>
                        </div>
                      </div>
                      <div className="agent-stats-mini">
                        <div className="agent-stat-card">
                          <div className="ast-val">247</div>
                          <div className="ast-lbl">Alerts Today</div>
                        </div>
                        <div className="agent-stat-card">
                          <div className="ast-val" style={{ color: '#F59E0B' }}>12</div>
                          <div className="ast-lbl">Active Cascades</div>
                        </div>
                        <div className="agent-stat-card">
                          <div className="ast-val" style={{ color: '#22c55e' }}>98.2%</div>
                          <div className="ast-lbl">Accuracy</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="tab-info">
                  <div className="tab-icon-large">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8213B" strokeWidth="1.5"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>
                  </div>
                  <h3>AI Operations Agent</h3>
                  <p>An autonomous agent monitors all trains every 30 seconds. Detects platform conflicts, predicts cascade delays, auto-drafts announcements in Hindi and English.</p>
                  <ul className="feature-list">
                    <li><span className="check-icon">✦</span> Autonomous loop — no human trigger needed</li>
                    <li><span className="check-icon">✦</span> Cascade delay prediction with causal reasoning</li>
                    <li><span className="check-icon">✦</span> Claude AI for natural language decision drafts</li>
                    <li><span className="check-icon">✦</span> Full audit trail — every decision logged</li>
                  </ul>
                </div>
              </div>

              {/* Tab: PWA */}
              <div className={`tab-panel ${activeTab === 'pwa' ? 'active' : ''}`} id="tab-pwa">
                <div className="tab-visual">
                  <div className="pwa-mockup">
                    <div className="phone-frame">
                      <div className="phone-screen">
                        <div className="pwa-header">
                          <svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#E8213B"/><path d="M6 14h16M6 10h16M6 18h16" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                          <span>RailSense</span>
                          <div className="pwa-bell">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            <span className="notif-dot"></span>
                          </div>
                        </div>
                        <div className="pwa-pnr-box">
                          <div className="pnr-label">Your PNR</div>
                          <div className="pnr-number">4812 6573 92</div>
                          <div className="pnr-train">12951 — Mumbai Rajdhani</div>
                        </div>
                        <div className="pwa-status-card">
                          <div className="status-row">
                            <span className="status-label">Train Status</span>
                            <span className="status-badge on-time">ON TIME</span>
                          </div>
                          <div className="status-row">
                            <span className="status-label">Current Speed</span>
                            <span className="status-val">112 km/h</span>
                          </div>
                          <div className="status-row">
                            <span className="status-label">Platform</span>
                            <span className="status-val" style={{ color: '#F59E0B' }}>Platform 3 →</span>
                          </div>
                          <div className="status-row">
                            <span className="status-label">Your Coach</span>
                            <span className="status-val">B4 — Bogie 7</span>
                          </div>
                        </div>
                        <div className="pwa-alert-box">
                          <div className="alert-icon">🔔</div>
                          <div>
                            <div className="alert-title">Platform Change Alert</div>
                            <div className="alert-msg">Platform changed from 5 → 3. Update your position now.</div>
                          </div>
                        </div>
                        <div className="pwa-timeline">
                          <div className="timeline-stop done">
                            <div className="ts-dot done-dot"></div>
                            <div className="ts-info"><span>Mumbai CST</span><span className="ts-time">09:00</span></div>
                          </div>
                          <div className="timeline-stop done">
                            <div className="ts-dot done-dot"></div>
                            <div className="ts-info"><span>Surat</span><span className="ts-time">12:47</span></div>
                          </div>
                          <div className="timeline-stop active-stop">
                            <div className="ts-dot active-dot"></div>
                            <div className="ts-info"><span>Vadodara</span><span className="ts-time ts-current">Now</span></div>
                          </div>
                          <div className="timeline-stop">
                            <div className="ts-dot future-dot"></div>
                            <div className="ts-info"><span>Ahmedabad</span><span className="ts-time ts-future">14:32</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="tab-info">
                  <div className="tab-icon-large">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#E8213B" strokeWidth="1.5"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </div>
                  <h3>Passenger PWA</h3>
                  <p>Enter your PNR. Get live coach position, platform updates, and delay alerts — 30 minutes before you need to know.</p>
                  <ul className="feature-list">
                    <li><span className="check-icon">✦</span> PNR-based personalised tracking</li>
                    <li><span className="check-icon">✦</span> Coach position — exact bogie location on platform</li>
                    <li><span className="check-icon">✦</span> Push alerts for platform changes & delays</li>
                    <li><span className="check-icon">✦</span> Works offline — installable PWA</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section section" id="how-it-works">
        <div className="container">
          <div className="section-eyebrow reveal">AGENTIC LOOP</div>
          <h2 className="section-title reveal">The Agent<br/><span className="gradient-text">Never Sleeps.</span></h2>
          <p className="section-subtitle reveal">Every 30 seconds, an autonomous AI loop runs across 13,000 trains — detecting, predicting, and acting without human intervention.</p>

          <div className="flow-diagram reveal" id="flow-diagram" ref={flowDiagramRef}>
            <div className={`flow-step ${activeFlowStep === 0 ? 'active-step' : ''}`} data-step="0">
              <div className="flow-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <div className="flow-step-label">Fetch Train Data</div>
              <div className="flow-step-desc">Live API pull every 30 seconds</div>
            </div>
            <div className="flow-arrow" aria-hidden="true">
              <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L20 6 M14 1 L20 6 L14 11" stroke="rgba(232,33,59,0.5)" strokeWidth="1.5" fill="none"/></svg>
            </div>
            <div className={`flow-step ${activeFlowStep === 1 ? 'active-step' : ''}`} data-step="1">
              <div className="flow-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </div>
              <div className="flow-step-label">Detect Delays</div>
              <div className="flow-step-desc">Compare schedule vs reality</div>
            </div>
            <div className="flow-arrow" aria-hidden="true">
              <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L20 6 M14 1 L20 6 L14 11" stroke="rgba(232,33,59,0.5)" strokeWidth="1.5" fill="none"/></svg>
            </div>
            <div className={`flow-step ${activeFlowStep === 2 ? 'active-step' : ''}`} data-step="2">
              <div className="flow-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="flow-step-label">Predict Cascade</div>
              <div className="flow-step-desc">Model downstream impact</div>
            </div>
            <div className="flow-arrow" aria-hidden="true">
              <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L20 6 M14 1 L20 6 L14 11" stroke="rgba(232,33,59,0.5)" strokeWidth="1.5" fill="none"/></svg>
            </div>
            <div className={`flow-step ${activeFlowStep === 3 ? 'active-step' : ''}`} data-step="3">
              <div className="flow-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/></svg>
              </div>
              <div className="flow-step-label">Claude AI Reasons</div>
              <div className="flow-step-desc">Natural language decision making</div>
            </div>
            <div className="flow-arrow" aria-hidden="true">
              <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L20 6 M14 1 L20 6 L14 11" stroke="rgba(232,33,59,0.5)" strokeWidth="1.5" fill="none"/></svg>
            </div>
            <div className={`flow-step ${activeFlowStep === 4 ? 'active-step' : ''}`} data-step="4">
              <div className="flow-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div className="flow-step-label">Auto Notify</div>
              <div className="flow-step-desc">Push to all affected passengers</div>
            </div>
            <div className="flow-arrow" aria-hidden="true">
              <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L20 6 M14 1 L20 6 L14 11" stroke="rgba(232,33,59,0.5)" strokeWidth="1.5" fill="none"/></svg>
            </div>
            <div className={`flow-step ${activeFlowStep === 5 ? 'active-step' : ''}`} data-step="5">
              <div className="flow-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 13.8a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.27 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div className="flow-step-label">Escalate if Needed</div>
              <div className="flow-step-desc">Alert station masters directly</div>
            </div>
            <div className="flow-arrow" aria-hidden="true">
              <svg width="24" height="12" viewBox="0 0 24 12"><path d="M0 6 L20 6 M14 1 L20 6 L14 11" stroke="rgba(232,33,59,0.5)" strokeWidth="1.5" fill="none"/></svg>
            </div>
            <div className={`flow-step ${activeFlowStep === 6 ? 'active-step' : ''}`} data-step="6">
              <div className="flow-step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div className="flow-step-label">Log Audit Trail</div>
              <div className="flow-step-desc">Every action recorded & traceable</div>
            </div>
          </div>

          <div className="flow-loop-label reveal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Repeats every 30 seconds, autonomously
          </div>
        </div>
      </section>

      {/* MAP HIGHLIGHT SECTION */}
      <section className="map-highlight section" id="demo">
        <div className="container">
          <div className="map-highlight-inner">
            <div className="map-highlight-text reveal">
              <div className="section-eyebrow">LIVE TRACKING</div>
              <h2 className="section-title" style={{ textAlign: 'left' }}>The Map India<br/><span className="gradient-text">Never Had.</span></h2>
              <div className="map-no-other-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8213B"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                No other platform offers this
              </div>
              <ul className="map-feature-list">
                <li>
                  <span className="mfl-icon">✦</span>
                  <div>
                    <strong>Real-time position</strong> of every active train across India's entire network
                  </div>
                </li>
                <li>
                  <span className="mfl-icon">✦</span>
                  <div>
                    <strong>Route path highlighted</strong> on map with delay heatmap overlays
                  </div>
                </li>
                <li>
                  <span className="mfl-icon">✦</span>
                  <div>
                    <strong>Delay, speed, platform</strong> — all accessible in one click on any train
                  </div>
                </li>
              </ul>
              <div className="map-ctas">
                <Link href="/track" className="btn-primary" id="explore-map-btn">Explore the Map</Link>
                <a href="#solution" className="btn-ghost" id="see-features-btn">See All Features</a>
              </div>
            </div>
            <div className="map-large-visual reveal">
              <div className="map-glow-wrapper">
                <div className="map-glow"></div>
                <svg className="india-large-map" viewBox="0 0 420 520" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="glow-filter">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                    <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#E8213B" stopOpacity="0.15"/>
                      <stop offset="100%" stopColor="#E8213B" stopOpacity="0"/>
                    </radialGradient>
                  </defs>
                  <rect width="420" height="520" fill="url(#mapGlow)" rx="12"/>
                  <path d="M175,28 L195,22 L220,26 L248,24 L270,34 L292,28 L316,44 L326,64 L338,88 L346,114 L350,142 L346,172 L338,196 L326,218 L314,240 L298,262 L280,284 L262,305 L244,326 L228,346 L216,366 L208,388 L202,410 L206,432 L214,452 L220,470 L218,488 L212,500 L204,490 L198,470 L190,448 L180,424 L168,400 L152,376 L135,354 L116,332 L98,308 L82,282 L68,256 L58,228 L50,200 L46,170 L48,140 L54,112 L66,88 L82,66 L102,50 L128,38 Z" fill="rgba(6,14,26,0.6)" stroke="rgba(232,33,59,0.2)" strokeWidth="1.5"/>
                  <path d="M185,60 Q210,110 230,160 Q250,210 240,268 Q230,320 215,370 Q205,410 208,450" fill="none" stroke="rgba(232,33,59,0.25)" strokeWidth="1.5" strokeDasharray="5 4"/>
                  <path d="M175,60 Q165,110 155,160 Q145,210 148,260 Q152,305 145,350" fill="none" stroke="rgba(232,33,59,0.15)" strokeWidth="1" strokeDasharray="4 5"/>
                  <path d="M200,60 Q220,90 265,130 Q290,170 280,220 Q270,260 260,300" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="1.5" strokeDasharray="5 4"/>
                  <path d="M140,110 Q180,140 210,180 Q240,220 250,270" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="1" strokeDasharray="4 5"/>
                  <path d="M120,180 Q155,200 185,240 Q205,270 210,310 Q215,350 210,390" fill="none" stroke="rgba(232,33,59,0.2)" strokeWidth="1.2" strokeDasharray="5 3"/>
                  
                  <circle cx="195" cy="72" r="5" fill="#E8213B" opacity="0.9" filter="url(#glow-filter)"/>
                  <circle cx="195" cy="72" r="12" fill="#E8213B" opacity="0">
                    <animate attributeName="r" values="5;18;5" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <text x="202" y="70" fill="rgba(240,244,255,0.6)" fontSize="8" fontFamily="Inter">New Delhi</text>

                  <circle cx="148" cy="240" r="5" fill="#F59E0B" opacity="0.9" filter="url(#glow-filter)"/>
                  <circle cx="148" cy="240" r="12" fill="#F59E0B" opacity="0">
                    <animate attributeName="r" values="5;18;5" dur="2.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite"/>
                  </circle>
                  <text x="110" y="238" fill="rgba(240,244,255,0.6)" fontSize="8" fontFamily="Inter">Mumbai</text>

                  <circle cx="275" cy="178" r="5" fill="#E8213B" opacity="0.8" filter="url(#glow-filter)"/>
                  <circle cx="275" cy="178" r="12" fill="#E8213B" opacity="0">
                    <animate attributeName="r" values="5;18;5" dur="3s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite"/>
                  </circle>
                  <text x="282" y="176" fill="rgba(240,244,255,0.6)" fontSize="8" fontFamily="Inter">Kolkata</text>

                  <circle cx="215" cy="380" r="5" fill="#F59E0B" opacity="0.8" filter="url(#glow-filter)"/>
                  <circle cx="215" cy="380" r="12" fill="#F59E0B" opacity="0">
                    <animate attributeName="r" values="5;18;5" dur="2.2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2.2s" repeatCount="indefinite"/>
                  </circle>
                  <text x="224" y="378" fill="rgba(240,244,255,0.6)" fontSize="8" fontFamily="Inter">Chennai</text>

                  <circle cx="200" cy="296" r="4" fill="#E8213B" opacity="0.7"/>
                  <circle cx="200" cy="296" r="10" fill="#E8213B" opacity="0">
                    <animate attributeName="r" values="4;14;4" dur="1.8s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="1.8s" repeatCount="indefinite"/>
                  </circle>

                  <circle cx="190" cy="150" r="3.5" fill="#E8213B" opacity="0.85">
                    <animateMotion dur="8s" repeatCount="indefinite" path="M185,60 Q210,110 230,160 Q250,210 240,268"/>
                  </circle>
                  <circle cx="0" cy="0" r="3.5" fill="#F59E0B" opacity="0.85">
                    <animateMotion dur="12s" repeatCount="indefinite" begin="3s" path="M175,60 Q165,110 155,160 Q145,210 148,260 Q152,305 145,350"/>
                  </circle>
                  <circle cx="0" cy="0" r="3" fill="#E8213B" opacity="0.7">
                    <animateMotion dur="10s" repeatCount="indefinite" begin="1s" path="M200,60 Q220,90 265,130 Q290,170 280,220 Q270,260 260,300"/>
                  </circle>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer" id="footer">
        <div className="footer-glow"></div>
        <div className="container">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="footer-logo">
                <svg width="32" height="32" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#E8213B"/><path d="M6 14h16M6 10h16M6 18h16" stroke="white" strokeWidth="2" strokeLinecap="round"/><circle cx="14" cy="22" r="2" fill="white"/><circle cx="8" cy="22" r="2" fill="white"/><circle cx="20" cy="22" r="2" fill="white"/></svg>
                <span>Rail<span style={{ color: '#E8213B' }}>Sense</span></span>
              </div>
              <p className="footer-tagline">India's Railway, Finally Intelligent.</p>
              <p className="footer-subtagline">Real-time tracking. AI-powered operations.<br/>Zero delays left unexplained.</p>
            </div>
            <div className="footer-links-group">
              <h4>Platform</h4>
              <a href="#solution">Live Train Map</a>
              <a href="#solution">AI Operations</a>
              <a href="#solution">Passenger PWA</a>
            </div>
            <div className="footer-links-group">
              <h4>Hackathon</h4>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div className="footer-links-group">
              <h4>Connect</h4>
              <a href="https://github.com/iamdhruv17/Rail-Sense" target="_blank" rel="noreferrer" id="github-link" className="footer-github-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub Repo
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-hackathon-badge">🏆 Built for <strong>FAR AWAY 2026</strong> — India's Biggest International Hackathon</p>
            <p className="footer-copy">© 2026 RailSense. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
