import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase, signUp, signIn, signOut, getProfile, interpretDream as apiInterpretDream, getDreamJournal, toggleFavorite, createCheckout, sendDreamChat, getDreamChatHistory, getSharedDreams, shareDream, likeDream, getLucidProgress, updateLucidProgress } from './lib/supabase'
import './App.css'

// ---- CONSTANTS ----
const LOADING_MESSAGES = [
  "Entering your subconscious...", "Analyzing dream symbols...",
  "Consulting the collective unconscious...", "Decoding hidden meanings...",
  "Mapping your dream landscape..."
]

// ---- LOCAL FALLBACK INTERPRETATION ----
function localInterpretation(dreamText) {
  const lower = dreamText.toLowerCase()
  const symbolMap = {
    water: '🌊 Water — emotions, the unconscious', ocean: '🌊 Ocean — vast emotions',
    flying: '🕊️ Flying — freedom, transcendence', falling: '⬇️ Falling — loss of control',
    house: '🏠 House — the self, psyche', door: '🚪 Door — opportunity',
    running: '🏃 Running — avoidance', chase: '👤 Being chased — fear',
    teeth: '🦷 Teeth — anxiety', death: '💀 Death — transformation',
    snake: '🐍 Snake — hidden fears', fire: '🔥 Fire — passion',
    forest: '🌲 Forest — the unconscious', wolf: '🐺 Wolf — instinct',
    dark: '🌑 Darkness — the unknown', light: '✨ Light — clarity',
    moon: '🌙 Moon — intuition', bird: '🐦 Bird — freedom',
    glass: '💎 Glass — fragility, transparency', rain: '🌧️ Rain — renewal',
    mountain: '⛰️ Mountain — obstacles', mirror: '🪞 Mirror — reflection',
  }
  const symbols = []
  for (const [k, v] of Object.entries(symbolMap)) {
    if (lower.includes(k) && symbols.length < 5) symbols.push(v)
  }
  if (!symbols.length) symbols.push('🔮 Unique imagery — personal symbolism', '🧠 Subconscious processing')
  const emotions = []
  if (lower.match(/scar|afraid|fear/)) emotions.push('Fear')
  if (lower.match(/happy|joy/)) emotions.push('Joy')
  if (lower.match(/calm|peace/)) emotions.push('Peace')
  if (lower.match(/confus|strange/)) emotions.push('Confusion')
  if (lower.match(/anxi|stress/)) emotions.push('Anxiety')
  if (!emotions.length) emotions.push('Curiosity', 'Wonder')
  const themes = []
  if (lower.match(/chas|run|escap/)) themes.push('pursuit and avoidance')
  if (lower.match(/fall|fly|float/)) themes.push('control and freedom')
  if (lower.match(/water|ocean|rain/)) themes.push('emotional depth')
  if (lower.match(/forest|tree|path|walk/)) themes.push('life journey')
  if (lower.match(/animal|wolf|dog|cat/)) themes.push('instinct and intuition')
  if (!themes.length) themes.push('personal transformation', 'subconscious processing')
  return {
    summary: dreamText.length > 120 ? dreamText.slice(0, 120) + '...' : dreamText,
    overview: `Your dream weaves together themes of ${themes.slice(0, 3).join(', ')}. This multilayered dream reflects your subconscious actively processing current life experiences.`,
    psychological: `From a Jungian perspective, this dream represents a dialogue between your conscious and unconscious mind. The imagery carries archetypal significance — your psyche is using universal symbols to communicate insights your waking mind hasn't yet integrated. The specific elements suggest a period of meaningful inner work.`,
    deepAnalysis: `Freud would interpret the sensory details of this dream as wish-fulfillment encoded in symbolic form. The dream-work has transformed latent content into manifest imagery through condensation and displacement. Your unconscious desires are finding safe expression through the metaphorical landscape of the dream. The recurring motifs point toward unresolved material from early experiences that is seeking conscious integration.`,
    symbols, emotions,
    moodScore: Math.floor(Math.random() * 40) + 40,
    advice: `Keep a dream journal by your bed and write immediately upon waking. Over time, you'll notice patterns that reveal your subconscious mind's deepest themes.`,
    patternInsight: `Based on your dream imagery, you may be in a period of transition. Pay attention to dreams over the next week — recurring symbols will clarify the specific area of your life undergoing change.`,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }
}

// ================================================================
// COMPONENTS
// ================================================================

// ---- AUTH MODAL ----
function AuthModal({ onClose, onAuth, mode: initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await signUp(email, password)
        if (authError) throw authError
        // Auto sign in immediately after signup
        const { data: signInData, error: signInError } = await signIn(email, password)
        if (signInError) throw signInError
        onAuth(signInData); onClose()
      } else {
        const { data, error: authError } = await signIn(email, password)
        if (authError) throw authError
        onAuth(data); onClose()
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-card" style={{ maxWidth: '400px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
        <button className="share-close" onClick={onClose}>✕</button>
        <div className="share-card-content">
          <div className="logo" style={{ textAlign: 'center' }}>✦ NIGHTMIND</div>
          <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontFamily: "'Playfair Display', serif" }}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
          </h3>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#9b8fb8', marginBottom: '1.5rem' }}>
            {mode === 'signin' ? 'Sign in to access your dream journal' : 'Start decoding your dreams for free'}
          </p>
          <form onSubmit={handleSubmit}>
            <div className="email-gate-form" style={{ maxWidth: '100%' }}>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '0.75rem', textAlign: 'center' }}>{error}</p>}
            {success && <p style={{ color: '#34d399', fontSize: '0.8rem', marginTop: '0.75rem', textAlign: 'center' }}>{success}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Free Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#9b8fb8', marginTop: '1rem' }}>
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
            <a onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}
              style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
              {mode === 'signin' ? 'Sign up free' : 'Sign in'}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ---- EMAIL GATE (shown after dream input, before results) ----
function EmailGate({ dreamText, onAuth, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signup')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await signUp(email, password)
        if (authError) throw authError
        // Auto sign in immediately after signup
        const { data: signInData, error: signInError } = await signIn(email, password)
        if (signInError) throw signInError
        onAuth(signInData)
      } else {
        const { data, error: authError } = await signIn(email, password)
        if (authError) throw authError
        onAuth(data)
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="email-gate">
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔮</div>
      <h3>Your Interpretation is Ready</h3>
      <p>Create a free account to see your full dream analysis, save it to your journal, and track patterns over time.</p>
      <form onSubmit={handleSubmit}>
        <div className="email-gate-form">
          <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder={mode === 'signup' ? 'Create a password' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          {error && <p style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</p>}
          {success && <p style={{ color: '#34d399', fontSize: '0.8rem' }}>{success}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Loading...' : mode === 'signup' ? 'Create Free Account & See Results' : 'Sign In & See Results'}
          </button>
        </div>
      </form>
      <p style={{ fontSize: '0.85rem', color: '#9b8fb8', marginTop: '1rem' }}>
        {mode === 'signup' ? 'Already have an account? ' : 'Need an account? '}
        <a onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}
          style={{ color: '#a78bfa', cursor: 'pointer', fontWeight: 600 }}>
          {mode === 'signup' ? 'Sign in' : 'Sign up free'}
        </a>
      </p>
      <div className="email-gate-preview">
        <p>✦ Your analysis includes: psychological breakdown, key symbols, emotional landscape, and personalized guidance</p>
      </div>
    </div>
  )
}

// ---- PUSH NOTIFICATION BANNER ----
function PushBanner({ onDismiss }) {
  const [notifTime, setNotifTime] = useState('07:00')
  const [enabled, setEnabled] = useState(false)

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setEnabled(true)
        scheduleMorningNotification(notifTime)
        // Show confirmation briefly, then dismiss
        setTimeout(onDismiss, 2000)
      } else {
        onDismiss()
      }
    } catch (err) { console.error(err); onDismiss() }
  }

  return (
    <div className="push-banner">
      <div className="push-banner-icon">🌙</div>
      <div className="push-banner-text">
        {enabled ? (
          <>
            <strong style={{ color: '#34d399' }}>Morning reminders enabled!</strong>
            <p>We'll nudge you at {notifTime.replace(/^0/, '')} every morning</p>
          </>
        ) : (
          <>
            <strong>Never forget a dream</strong>
            <p>Get a morning reminder to log your dream before it fades</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#9b8fb8' }}>Wake time:</label>
              <input type="time" value={notifTime} onChange={e => setNotifTime(e.target.value)}
                style={{
                  background: 'rgba(10,5,21,0.6)', border: '1px solid rgba(139,92,246,0.15)',
                  borderRadius: '6px', color: '#f0edf6', padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem', fontFamily: 'inherit',
                }} />
            </div>
          </>
        )}
      </div>
      {!enabled && (
        <div className="push-banner-actions">
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={handleEnable}>Enable</button>
          <button className="push-banner-close" onClick={onDismiss}>✕</button>
        </div>
      )}
    </div>
  )
}

// Schedule morning notification using the Notification API + setTimeout
function scheduleMorningNotification(timeStr) {
  const scheduleNext = () => {
    const now = new Date()
    const [hours, minutes] = timeStr.split(':').map(Number)
    const target = new Date()
    target.setHours(hours, minutes, 0, 0)
    // If target time already passed today, schedule for tomorrow
    if (target <= now) target.setDate(target.getDate() + 1)
    const delay = target - now

    setTimeout(() => {
      if (Notification.permission === 'granted') {
        const messages = [
          "What did you dream last night? Record it before it fades...",
          "Your subconscious left you a message. Let's decode it.",
          "Dreams are freshest in the first 5 minutes. Quick, write it down!",
          "Good morning! Your dream journal is waiting.",
          "The best insights come from dreams you almost forgot. Capture yours now.",
        ]
        const msg = messages[Math.floor(Math.random() * messages.length)]
        new Notification('🌙 NightMind — Dream Reminder', {
          body: msg,
          icon: '/icon-192.png',
          tag: 'morning-dream-reminder',
          requireInteraction: true,
        })
      }
      // Reschedule for next day
      scheduleNext()
    }, delay)
  }
  scheduleNext()
}

// ---- STREAK BANNER ----
function StreakBanner({ streak }) {
  if (streak < 2) return null
  const messages = [
    '', '', '2 days strong!', 'Hat trick!', 'On fire!',
    'Dream master!', 'Incredible!', 'Legendary streak!',
  ]
  return (
    <div className="streak-banner">
      <div className="streak-fire">🔥</div>
      <div>
        <div className="streak-count">{streak} Day Streak</div>
        <div className="streak-label">{messages[Math.min(streak, 7)]}</div>
      </div>
      <div className="streak-message">Keep logging dreams to maintain your streak!</div>
    </div>
  )
}

// ---- NAV ----
function Nav({ onNavigate, user, onAuthClick, onSignOut }) {
  return (
    <nav className="nav">
      <a className="nav-logo" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>NightMind</a>
      <ul className="nav-links">
        <li><a className="hide-mobile" onClick={() => onNavigate('home')}>Features</a></li>
        <li><a className="hide-mobile" onClick={() => onNavigate('community')}>Community</a></li>
        <li><a className="hide-mobile" onClick={() => onNavigate('lucid')}>Lucid Training</a></li>
        <li><a className="hide-mobile" onClick={() => onNavigate('pricing')}>Pricing</a></li>
        {user && <li><a className="hide-mobile" onClick={() => onNavigate('journal')}>Journal</a></li>}
        {user ? (
          <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => onNavigate('interpret')}>Interpret Dream</button>
            <button className="btn btn-secondary" onClick={onSignOut} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Sign Out</button>
          </li>
        ) : (
          <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={onAuthClick}>Sign In</button>
            <button className="btn btn-primary" onClick={() => onNavigate('interpret')}>Try Free</button>
          </li>
        )}
      </ul>
    </nav>
  )
}

// ---- HERO ----
function Hero({ onNavigate }) {
  return (
    <section className="hero">
      <div className="hero-orb" />
      <div className="hero-badge">✦ AI-Powered Dream Analysis</div>
      <h1>Decode Your<br /><span className="gradient-text">Dreams</span></h1>
      <p className="hero-sub">Uncover the hidden messages in your dreams with deep psychological analysis powered by AI. Jungian. Freudian. Personal.</p>
      <div className="hero-cta">
        <button className="btn btn-primary btn-large" onClick={() => onNavigate('interpret')}>Interpret My Dream →</button>
        <button className="btn btn-secondary btn-large" onClick={() => onNavigate('pricing')}>See Pricing</button>
      </div>
      <div className="hero-stats">
        <div className="hero-stat"><div className="hero-stat-num">50K+</div><div className="hero-stat-label">Dreams Analyzed</div></div>
        <div className="hero-stat"><div className="hero-stat-num">4.9★</div><div className="hero-stat-label">User Rating</div></div>
        <div className="hero-stat"><div className="hero-stat-num">30s</div><div className="hero-stat-label">Avg. Analysis</div></div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section>
      <div className="text-center"><div className="section-label">How It Works</div><h2 className="section-title">Three Steps to Understanding</h2></div>
      <div className="steps-grid">
        <div className="step-card"><div className="step-number">1</div><h3>Describe Your Dream</h3><p>Write down everything you remember — people, places, feelings, events.</p></div>
        <div className="step-card"><div className="step-number">2</div><h3>AI Analyzes Deeply</h3><p>Our AI draws from Jungian, Freudian, and modern dream psychology.</p></div>
        <div className="step-card"><div className="step-number">3</div><h3>Get Your Insights</h3><p>Receive a beautiful, shareable card with symbols, emotions, and guidance.</p></div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section>
      <div className="text-center"><div className="section-label">Features</div><h2 className="section-title">More Than Just Interpretation</h2><p className="section-desc mx-auto">NightMind combines AI with deep psychological frameworks.</p></div>
      <div className="features-grid">
        <div className="feature-card"><div className="feature-icon">🧠</div><h3>Deep Psychology</h3><p>Jungian archetypes, Freudian theory, and modern dream science.</p></div>
        <div className="feature-card"><div className="feature-icon">🎨</div><h3>Dream Art</h3><p>AI-generated artwork that visualizes your dream.</p></div>
        <div className="feature-card"><div className="feature-icon">📊</div><h3>Pattern Tracking</h3><p>Calendar journal with recurring symbol and emotional pattern detection.</p></div>
        <div className="feature-card"><div className="feature-icon">📱</div><h3>Shareable Cards</h3><p>Beautiful cards designed for TikTok, Instagram, and Twitter.</p></div>
        <div className="feature-card"><div className="feature-icon">🔮</div><h3>500+ Symbols</h3><p>Dream symbols with psychological meanings from multiple traditions.</p></div>
        <div className="feature-card"><div className="feature-icon">🔥</div><h3>Dream Streaks</h3><p>Build a daily logging habit with streaks and achievements.</p></div>
      </div>
    </section>
  )
}

function Testimonials() {
  const reviews = [
    { text: "NightMind showed me connections I never noticed. The Jungian analysis is genuinely insightful.", name: "Maya K.", handle: "@mayakreates", initials: "MK" },
    { text: "Made a TikTok about my dream interpretation and it got 200K views. The share cards are beautiful.", name: "Jordan T.", handle: "@jordtee", initials: "JT" },
    { text: "The calendar journal is addicting. Seeing a whole month of dream patterns is mind-blowing.", name: "Alex R.", handle: "@alexrdreams", initials: "AR" },
  ]
  return (
    <section>
      <div className="text-center"><div className="section-label">Testimonials</div><h2 className="section-title">What Dreamers Say</h2></div>
      <div className="testimonials-grid">
        {reviews.map((r, i) => (
          <div key={i} className="testimonial-card">
            <p className="testimonial-text">"{r.text}"</p>
            <div className="testimonial-author"><div className="testimonial-avatar">{r.initials}</div><div><div className="testimonial-name">{r.name}</div><div className="testimonial-handle">{r.handle}</div></div></div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---- DREAM INTERPRETER (with email gate) ----
// ---- VOICE RECORDING HOOK ----
function useVoiceInput() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' '
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }
        setTranscript(finalTranscript + interimTranscript)
      }

      recognition.onerror = (event) => {
        console.error('Speech error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  return { isListening, transcript, supported, startListening, stopListening }
}

// ---- VOICE RECORDER UI ----
function VoiceRecorder({ onTranscript, isListening, onStart, onStop, duration }) {
  return (
    <div className="voice-recorder">
      <div className={`voice-orb ${isListening ? 'active' : ''}`} onClick={isListening ? onStop : onStart}>
        <div className="voice-orb-inner">
          {isListening ? (
            <div className="voice-waves">
              <div className="voice-wave" /><div className="voice-wave" /><div className="voice-wave" />
              <div className="voice-wave" /><div className="voice-wave" />
            </div>
          ) : (
            <span className="voice-mic">🎙️</span>
          )}
        </div>
      </div>
      <p className="voice-label">
        {isListening ? `Listening... ${duration}s` : 'Tap to speak your dream'}
      </p>
      {isListening && (
        <button className="btn btn-secondary" onClick={onStop} style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
          ✓ Done Speaking
        </button>
      )}
    </div>
  )
}

function DreamInterpreter({ user, onResult, onAuthClick, onEmailGateAuth }) {
  const [dreamText, setDreamText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [error, setError] = useState('')
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [pendingDream, setPendingDream] = useState('')
  const [inputMode, setInputMode] = useState('text') // 'text' or 'voice'
  const [voiceDuration, setVoiceDuration] = useState(0)
  const voiceTimerRef = useRef(null)

  const { isListening, transcript, supported, startListening, stopListening } = useVoiceInput()

  // Sync voice transcript to dreamText
  useEffect(() => {
    if (transcript) setDreamText(prev => {
      // If we just started voice, replace. Otherwise append.
      if (inputMode === 'voice') return transcript
      return prev
    })
  }, [transcript, inputMode])

  // Voice duration timer
  useEffect(() => {
    if (isListening) {
      setVoiceDuration(0)
      voiceTimerRef.current = setInterval(() => setVoiceDuration(d => d + 1), 1000)
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current)
      // If we were recording and stopped, switch back to text to show the result
      if (inputMode === 'voice' && dreamText.length > 0) {
        setInputMode('text')
      }
    }
    return () => { if (voiceTimerRef.current) clearInterval(voiceTimerRef.current) }
  }, [isListening])

  const handleVoiceStart = () => {
    setInputMode('voice')
    startListening()
  }

  const handleVoiceStop = () => {
    stopListening()
  }

  const handleSubmit = async () => {
    if (dreamText.trim().length < 20) return
    setError('')

    if (!user) {
      setPendingDream(dreamText)
      setShowEmailGate(true)
      return
    }

    await doInterpret(dreamText)
  }

  const doInterpret = async (text) => {
    setLoading(true); setShowEmailGate(false)
    let msgIndex = 0
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[msgIndex])
    }, 1500)

    try {
      const result = await apiInterpretDream(text)
      clearInterval(interval); setLoading(false)
      onResult(result)
    } catch (err) {
      clearInterval(interval); setLoading(false)
      if (err.error === 'limit_reached') {
        setError(err.message)
      } else {
        const result = localInterpretation(text)
        onResult(result)
      }
    }
  }

  const handleEmailGateAuth = (data) => {
    onEmailGateAuth(data)
    setTimeout(() => doInterpret(pendingDream), 500)
  }

  return (
    <div className="interpret-section">
      <div className="text-center">
        <div className="section-label">Dream Interpreter</div>
        <h2 className="section-title">What Did You Dream?</h2>
        <p className="section-desc mx-auto">Describe your dream in as much detail as you can remember — type it or speak it.</p>
      </div>
      <div className="dream-input-card">
        {showEmailGate ? (
          <EmailGate dreamText={pendingDream} onAuth={handleEmailGateAuth} onClose={() => setShowEmailGate(false)} />
        ) : loading ? (
          <div className="loading-container">
            <div className="loading-orbs"><div className="loading-orb" /><div className="loading-orb" /><div className="loading-orb" /></div>
            <p className="loading-text">{loadingMsg}</p>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            {supported && (
              <div className="input-mode-toggle">
                <button className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`} onClick={() => { setInputMode('text'); if (isListening) stopListening() }}>
                  ✏️ Type
                </button>
                <button className={`mode-btn ${inputMode === 'voice' || isListening ? 'active' : ''}`} onClick={() => { if (!isListening) { setInputMode('voice'); handleVoiceStart() } }}>
                  🎙️ Speak
                </button>
              </div>
            )}

            {/* Voice mode */}
            {(inputMode === 'voice' && isListening) ? (
              <VoiceRecorder
                onTranscript={setDreamText}
                isListening={isListening}
                onStart={handleVoiceStart}
                onStop={handleVoiceStop}
                duration={voiceDuration}
              />
            ) : null}

            {/* Text area (shown in text mode, or after voice recording finishes) */}
            {(inputMode === 'text' || !isListening) && (
              <>
                <div style={{ position: 'relative' }}>
                  <textarea className="dream-textarea"
                    placeholder="I was walking through a forest at night when I noticed the trees were made of glass. A wolf appeared on the path ahead, but instead of being afraid, I felt calm..."
                    value={dreamText} onChange={e => setDreamText(e.target.value)} maxLength={2000} />
                  {/* Inline mic button */}
                  {supported && !isListening && (
                    <button className="inline-mic-btn" onClick={handleVoiceStart} title="Speak your dream">
                      🎙️
                    </button>
                  )}
                </div>
                <div className="dream-submit-row">
                  <span className="char-count">{dreamText.length}/2000</span>
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={dreamText.trim().length < 20}>✦ Interpret My Dream</button>
                </div>
              </>
            )}

            {error && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '12px' }}>
                <p style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{error}</p>
                <button className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={onAuthClick}>Upgrade to Pro — $8.99/mo →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---- RESULT CARD (with blurred Pro sections) ----
function ResultCard({ result, onShare, onNew, profile, onUpgrade }) {
  const isPro = profile?.subscription_tier === 'pro'

  return (
    <div className="interpret-section">
      <div className="result-card">
        <div className="result-header">
          <div className="result-badge">✦ NightMind Analysis</div>
          <div className="result-date">{result.date}</div>
        </div>
        <div className="result-body">
          <p className="result-dream-summary">"{result.summary}"</p>

          {/* FREE: Overview (always visible) */}
          <div className="interpretation-section">
            <div className="interpretation-label">Overview</div>
            <p className="interpretation-text">{result.overview}</p>
          </div>

          {/* FREE: Core Theme (if available) */}
          {result.coreTheme && (
            <div className="interpretation-section">
              <div className="interpretation-label">Core Theme</div>
              <p className="interpretation-text" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-light)' }}>{result.coreTheme}</p>
            </div>
          )}

          {/* FREE: Element Breakdown (always visible — the premium feel) */}
          {result.elementBreakdown && result.elementBreakdown.length > 0 && (
            <div className="interpretation-section">
              <div className="interpretation-label">Dream Elements</div>
              <div className="element-breakdown">
                {result.elementBreakdown.map((el, i) => (
                  <div key={i} className="element-card">
                    <div className="element-name">{el.element}</div>
                    <div className="element-role">{el.role}</div>
                    <div className="element-interp">{el.interpretation}</div>
                    <div className="element-reason">{el.reasoning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FREE: Key Symbols (always visible) */}
          <div className="interpretation-section">
            <div className="interpretation-label">Key Symbols</div>
            <div className="symbols-grid">{(result.symbols || []).map((s, i) => <span key={i} className="symbol-tag">{s}</span>)}</div>
          </div>

          {/* FREE: Emotional Landscape (always visible) */}
          <div className="interpretation-section">
            <div className="interpretation-label">Emotional Landscape</div>
            <div className="symbols-grid">{(result.emotions || []).map((e, i) => <span key={i} className="symbol-tag">{e}</span>)}</div>
            <div className="mood-bar"><div className="mood-fill" style={{ width: `${result.moodScore || 50}%` }} /></div>
          </div>

          {/* FREE: Real-Life Connection (if available) */}
          {result.realLifeConnection && (
            <div className="interpretation-section">
              <div className="interpretation-label">Real-Life Connection</div>
              <p className="interpretation-text">{result.realLifeConnection}</p>
            </div>
          )}

          {/* PRO: Psychological Analysis (blurred for free) */}
          {isPro ? (
            <div className="interpretation-section">
              <div className="interpretation-label">Psychological Analysis</div>
              <p className="interpretation-text">{result.psychological}</p>
            </div>
          ) : (
            <div className="pro-locked">
              <div className="pro-locked-content">
                <div className="interpretation-label">Psychological Analysis</div>
                <p className="interpretation-text">{result.psychological || 'A deeper look at what your specific dream elements reveal about your inner state...'}</p>
              </div>
              <div className="pro-locked-overlay">
                <div className="lock-icon">🔒</div>
                <p>Deep Psychology — Pro Only</p>
                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1.25rem' }} onClick={onUpgrade}>Unlock with Pro →</button>
              </div>
            </div>
          )}

          {/* PRO: Deep Analysis (blurred for free) */}
          {isPro ? (
            <div className="interpretation-section">
              <div className="interpretation-label">Deep Dive</div>
              <p className="interpretation-text">{result.deepAnalysis}</p>
            </div>
          ) : (
            <div className="pro-locked">
              <div className="pro-locked-content">
                <div className="interpretation-label">Deep Dive</div>
                <p className="interpretation-text">{result.deepAnalysis || 'Connecting your specific dream details to deeper patterns and possible real-life triggers...'}</p>
              </div>
              <div className="pro-locked-overlay">
                <div className="lock-icon">🔒</div>
                <p>Deep Analysis — Pro Only</p>
                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1.25rem' }} onClick={onUpgrade}>Unlock with Pro →</button>
              </div>
            </div>
          )}

          {/* PRO: Pattern Insight (blurred for free) */}
          {isPro ? (
            <div className="interpretation-section">
              <div className="interpretation-label">Pattern Insight</div>
              <p className="interpretation-text">{result.patternInsight}</p>
            </div>
          ) : (
            <div className="pro-locked">
              <div className="pro-locked-content">
                <div className="interpretation-label">Pattern Insight</div>
                <p className="interpretation-text">{result.patternInsight || 'What to watch for in your next few dreams based on tonight\'s imagery...'}</p>
              </div>
              <div className="pro-locked-overlay">
                <div className="lock-icon">📊</div>
                <p>Pattern Analysis — Pro Only</p>
                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1.25rem' }} onClick={onUpgrade}>Unlock with Pro →</button>
              </div>
            </div>
          )}

          {/* FREE: Guidance (always visible) */}
          <div className="interpretation-section">
            <div className="interpretation-label">Guidance</div>
            <p className="interpretation-text">{result.advice}</p>
          </div>

          {/* FREE: Follow-Up Questions (if available) */}
          {result.followUpQuestions && result.followUpQuestions.length > 0 && (
            <div className="interpretation-section">
              <div className="interpretation-label">Questions to Explore</div>
              <div className="followup-questions">
                {result.followUpQuestions.map((q, i) => (
                  <div key={i} className="followup-q">
                    <span className="followup-icon">?</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.dreamsRemaining !== undefined && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {result.dreamsRemaining === 'unlimited' ? '✦ Pro — Unlimited interpretations' : `${result.dreamsRemaining} free interpretation${result.dreamsRemaining !== 1 ? 's' : ''} remaining this month`}
            </p>
          )}
        </div>
        <div className="result-actions">
          <button className="btn btn-primary" onClick={onShare}>📱 Share Card</button>
          <button className="btn btn-secondary" onClick={onNew}>✦ New Dream</button>
          {!isPro && <button className="btn btn-secondary" onClick={onUpgrade} style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }}>⭐ Upgrade to Pro</button>}
        </div>
      </div>
    </div>
  )
}

// ---- SHARE CARD ----
function ShareCard({ result, onClose }) {
  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-card" onClick={e => e.stopPropagation()}>
        <button className="share-close" onClick={onClose}>✕</button>
        <div className="share-card-content">
          <div className="logo">✦ NIGHTMIND</div>
          <p className="dream-excerpt">"{result.summary}"</p>
          <p className="meaning">{result.overview.slice(0, 200)}...</p>
          <div className="symbols-grid" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            {result.symbols.slice(0, 3).map((s, i) => <span key={i} className="symbol-tag">{s.split('—')[0].trim()}</span>)}
          </div>
          <p className="cta">nightmind.app — decode your dreams</p>
        </div>
      </div>
    </div>
  )
}

// ---- CALENDAR JOURNAL ----
function CalendarJournal({ onNavigate, profile, onUpgrade }) {
  const [dreams, setDreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDream, setSelectedDream] = useState(null)

  useEffect(() => { loadDreams() }, [])

  const loadDreams = async () => {
    try { const data = await getDreamJournal(); setDreams(data || []) }
    catch (err) { console.error(err) }
    setLoading(false)
  }

  // Calculate streak
  const streak = useMemo(() => {
    if (!dreams.length) return 0
    const dates = [...new Set(dreams.map(d => new Date(d.created_at).toDateString()))].sort((a, b) => new Date(b) - new Date(a))
    let count = 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today); expected.setDate(expected.getDate() - i)
      if (new Date(dates[i]).toDateString() === expected.toDateString()) count++
      else break
    }
    return count
  }, [dreams])

  // Build calendar data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()

    const dreamsByDate = {}
    dreams.forEach(d => {
      const dateStr = new Date(d.created_at).toLocaleDateString('en-CA') // YYYY-MM-DD
      if (!dreamsByDate[dateStr]) dreamsByDate[dateStr] = []
      dreamsByDate[dateStr].push(d)
    })

    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true })
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
      const dayDreams = dreamsByDate[dateStr] || []
      cells.push({ day, isToday, dreams: dayDreams, dateStr })
    }
    return cells
  }, [currentMonth, dreams])

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  // Stats
  const totalDreams = dreams.length
  const uniqueSymbols = [...new Set(dreams.flatMap(d => d.symbols || []))].length
  const avgMood = dreams.length ? Math.round(dreams.reduce((s, d) => s + (d.mood_score || 60), 0) / dreams.length) : 0
  const favCount = dreams.filter(d => d.is_favorite).length

  return (
    <div className="journal-container">
      <div className="text-center">
        <div className="section-label">Dream Journal</div>
        <h2 className="section-title">Your Dream Calendar</h2>
      </div>

      <StreakBanner streak={streak} />

      {/* Stats row */}
      <div className="journal-stats">
        <div className="journal-stat-card"><div className="journal-stat-value">{totalDreams}</div><div className="journal-stat-label">Dreams</div></div>
        <div className="journal-stat-card"><div className="journal-stat-value">{streak}🔥</div><div className="journal-stat-label">Streak</div></div>
        <div className="journal-stat-card"><div className="journal-stat-value">{uniqueSymbols}</div><div className="journal-stat-label">Symbols</div></div>
        <div className="journal-stat-card"><div className="journal-stat-value">{avgMood}%</div><div className="journal-stat-label">Avg Mood</div></div>
      </div>

      {loading ? (
        <div className="loading-container" style={{ marginTop: '2rem' }}><div className="loading-orbs"><div className="loading-orb" /><div className="loading-orb" /><div className="loading-orb" /></div></div>
      ) : (
        <div className="calendar-wrapper">
          <div className="calendar-header">
            <h3>{monthName}</h3>
            <div className="calendar-nav">
              <button onClick={prevMonth}>←</button>
              <button onClick={nextMonth}>→</button>
            </div>
          </div>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            {calendarData.map((cell, i) => (
              <div key={i}
                className={`calendar-day ${cell.empty ? 'empty' : ''} ${cell.isToday ? 'today' : ''} ${cell.dreams?.length ? 'has-dream' : ''} ${cell.dreams?.length > 1 ? 'multi' : ''}`}
                onClick={() => cell.dreams?.length && setSelectedDream(cell.dreams[0])}>
                {!cell.empty && (
                  <>
                    {cell.day}
                    {cell.dreams?.length > 0 && <div className="dream-dot" />}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Selected dream detail */}
          {selectedDream && (
            <div className="dream-detail-panel">
              <div className="dream-detail-date">
                {new Date(selectedDream.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <p className="dream-detail-text">
                "{selectedDream.dream_text.length > 300 ? selectedDream.dream_text.slice(0, 300) + '...' : selectedDream.dream_text}"
              </p>
              {selectedDream.interpretation?.overview && (
                <p className="dream-detail-interp">{selectedDream.interpretation.overview}</p>
              )}
              <div className="symbols-grid" style={{ marginTop: '0.75rem' }}>
                {(selectedDream.emotions || []).map((e, i) => <span key={i} className="symbol-tag">{e}</span>)}
                {(selectedDream.symbols || []).slice(0, 3).map((s, i) => <span key={i} className="symbol-tag">{s}</span>)}
              </div>
              <button className="btn btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem' }}
                onClick={() => setSelectedDream(null)}>Close</button>
            </div>
          )}
        </div>
      )}

      {dreams.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Your journal is empty — interpret your first dream to start!</p>
          <button className="btn btn-primary" onClick={() => onNavigate('interpret')}>Interpret Your First Dream →</button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button className="btn btn-primary" onClick={() => onNavigate('interpret')}>+ Log Today's Dream</button>
      </div>
    </div>
  )
}

// ---- PRICING ----
function Pricing({ onNavigate, user, profile, onAuthClick }) {
  const [loading, setLoading] = useState(false)
  const handleUpgrade = async () => {
    if (!user) { onAuthClick(); return }
    setLoading(true)
    try {
      const { url } = await createCheckout('price_1TK3nDJNbika93x6lB2lbIBx')
      window.location.href = url
    } catch (err) {
      console.error(err)
      alert('Payment error: ' + (err?.error || err?.message || JSON.stringify(err)))
    }
    setLoading(false)
  }

  return (
    <section>
      <div className="text-center"><div className="section-label">Pricing</div><h2 className="section-title">Unlock Your Subconscious</h2><p className="section-desc mx-auto">Start free. Upgrade when you're ready to go deeper.</p></div>
      <div className="pricing-grid">
        <div className="pricing-card">
          <div className="pricing-name">Free</div>
          <div className="pricing-price">$0 <span>/mo</span></div>
          <div className="pricing-desc">Perfect to get started</div>
          <ul className="pricing-features">
            <li><span className="check">✓</span> 3 interpretations/month</li>
            <li><span className="check">✓</span> Basic overview & symbols</li>
            <li><span className="check">✓</span> Shareable result cards</li>
            <li><span className="check">✓</span> Dream calendar journal</li>
          </ul>
          <button className="btn btn-secondary" onClick={() => onNavigate('interpret')} style={{ width: '100%', justifyContent: 'center' }}>
            {profile?.subscription_tier === 'free' ? 'Current Plan' : 'Get Started Free'}
          </button>
        </div>
        <div className="pricing-card featured">
          <div className="pricing-popular">Most Popular</div>
          <div className="pricing-name">Pro</div>
          <div className="pricing-price">$8.99 <span>/mo</span></div>
          <div className="pricing-desc">For dedicated dreamers</div>
          <ul className="pricing-features">
            <li><span className="check">✓</span> Unlimited interpretations</li>
            <li><span className="check">✓</span> Deep Jungian & Freudian analysis</li>
            <li><span className="check">✓</span> AI-generated dream art</li>
            <li><span className="check">✓</span> Pattern detection across dreams</li>
            <li><span className="check">✓</span> Priority AI processing</li>
            <li><span className="check">✓</span> Export journal as PDF</li>
          </ul>
          <button className="btn btn-primary" onClick={handleUpgrade} disabled={loading || profile?.subscription_tier === 'pro'}
            style={{ width: '100%', justifyContent: 'center' }}>
            {profile?.subscription_tier === 'pro' ? '✦ Current Plan' : loading ? 'Loading...' : 'Start 7-Day Free Trial'}
          </button>
        </div>
      </div>
    </section>
  )
}

function CTASection({ onNavigate }) {
  return (
    <div className="cta-section">
      <div className="section-label">Ready?</div>
      <h2 className="section-title">What Did You Dream Last Night?</h2>
      <p className="section-desc mx-auto" style={{ marginBottom: '2rem' }}>Your subconscious is trying to tell you something.</p>
      <button className="btn btn-primary btn-large" onClick={() => onNavigate('interpret')}>Interpret My Dream Free →</button>
    </div>
  )
}

// ---- DREAM CHAT (follow-up questions) ----
function DreamChat({ dreamId, dreamText, user, profile, onUpgrade }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef(null)
  const isPro = profile?.subscription_tier === 'pro'

  useEffect(() => {
    if (dreamId && user) loadHistory()
  }, [dreamId, user])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    try { const data = await getDreamChatHistory(dreamId); setMessages(data || []) }
    catch (err) { console.error(err) }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    if (!isPro && messages.filter(m => m.role === 'user').length >= 2) {
      // Free users get 2 follow-ups per dream
      return
    }
    const userMsg = input.trim()
    setInput(''); setSending(true)
    setMessages(prev => [...prev, { role: 'user', message: userMsg, created_at: new Date().toISOString() }])

    try {
      const { reply } = await sendDreamChat(dreamId, userMsg, dreamText, messages)
      setMessages(prev => [...prev, { role: 'assistant', message: reply, created_at: new Date().toISOString() }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', message: 'Something went wrong. Try again.', created_at: new Date().toISOString() }])
    }
    setSending(false)
  }

  const freeQuestionsLeft = 2 - messages.filter(m => m.role === 'user').length

  const suggestedQuestions = [
    "What does the main symbol mean for me personally?",
    "Why do I keep dreaming about this?",
    "How can I use this dream for personal growth?",
    "What would Jung say about this dream?",
  ]

  return (
    <div className="dream-chat">
      <div className="dream-chat-header">
        <span>💬</span>
        <div>
          <strong>Chat With Your Dream</strong>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Ask follow-up questions — dig deeper</p>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="chat-suggestions">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Try asking:</p>
          {suggestedQuestions.map((q, i) => (
            <button key={i} className="chat-suggestion-btn" onClick={() => { setInput(q); }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-msg-avatar">{m.role === 'user' ? '🌙' : '✦'}</div>
            <div className="chat-msg-bubble">
              <p>{m.message}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="chat-msg assistant">
            <div className="chat-msg-avatar">✦</div>
            <div className="chat-msg-bubble"><p className="loading-text" style={{ margin: 0 }}>Reflecting...</p></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!isPro && freeQuestionsLeft <= 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', background: 'rgba(139,92,246,0.08)', borderRadius: '12px', marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--accent-light)', marginBottom: '0.5rem' }}>Upgrade to Pro for unlimited dream conversations</p>
          <button className="btn btn-primary" style={{ fontSize: '0.8rem' }} onClick={onUpgrade}>Unlock Pro →</button>
        </div>
      ) : (
        <div className="chat-input-row">
          <input type="text" className="chat-input" placeholder="Ask about your dream..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={sending} />
          <button className="btn btn-primary chat-send" onClick={handleSend} disabled={sending || !input.trim()}>→</button>
        </div>
      )}
      {!isPro && freeQuestionsLeft > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
          {freeQuestionsLeft} free question{freeQuestionsLeft !== 1 ? 's' : ''} left • Pro = unlimited
        </p>
      )}
    </div>
  )
}

// ---- COMMUNITY DREAM FEED ----
function CommunityFeed({ user, onAuthClick }) {
  const [dreams, setDreams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadFeed() }, [])

  const loadFeed = async () => {
    try { const data = await getSharedDreams(); setDreams(data || []) }
    catch (err) { console.error(err) }
    setLoading(false)
  }

  const handleLike = async (id) => {
    if (!user) { onAuthClick(); return }
    try {
      await likeDream(id)
      setDreams(prev => prev.map(d => d.id === id ? { ...d, likes_count: (d.likes_count || 0) + 1 } : d))
    } catch (err) { console.error(err) }
  }

  // Sample dreams for when feed is empty
  const sampleDreams = [
    { id: 'sample1', display_name: 'Luna M.', dream_excerpt: 'I was swimming in an ocean made of stars. Each star I touched turned into a memory from my childhood...', interpretation_excerpt: 'Themes of nostalgia and emotional vastness. Your subconscious is processing foundational memories.', symbols: ['🌊 Ocean', '⭐ Stars', '👶 Childhood'], emotions: ['Wonder', 'Peace'], likes_count: 42, created_at: new Date().toISOString() },
    { id: 'sample2', display_name: 'Anonymous Dreamer', dream_excerpt: 'A giant clock was melting in my living room while my cat tried to catch the dripping numbers...', interpretation_excerpt: 'A surreal exploration of time anxiety. The familiar setting grounds an abstract fear.', symbols: ['⏰ Clock', '🐈 Cat', '🏠 Home'], emotions: ['Confusion', 'Curiosity'], likes_count: 28, created_at: new Date().toISOString() },
    { id: 'sample3', display_name: 'DreamWalker', dream_excerpt: 'I could fly but only as high as the treetops. Every time I went higher, gravity pulled me back gently...', interpretation_excerpt: 'A nuanced take on ambition vs. grounding. You seek transcendence but value stability.', symbols: ['🕊️ Flying', '🌳 Trees', '⬇️ Gravity'], emotions: ['Freedom', 'Acceptance'], likes_count: 67, created_at: new Date().toISOString() },
  ]

  const displayDreams = dreams.length > 0 ? dreams : sampleDreams

  return (
    <div className="journal-container" style={{ maxWidth: '700px' }}>
      <div className="text-center">
        <div className="section-label">Community</div>
        <h2 className="section-title">Dream Feed</h2>
        <p className="section-desc mx-auto">Explore dreams from the community. What are people dreaming about?</p>
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center', padding: '0.75rem', background: 'rgba(139,92,246,0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔒 All dreams are shared anonymously. Your privacy is always protected.</p>
      </div>

      {loading ? (
        <div className="loading-container" style={{ marginTop: '2rem' }}><div className="loading-orbs"><div className="loading-orb" /><div className="loading-orb" /><div className="loading-orb" /></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          {displayDreams.map(d => (
            <div key={d.id} className="feature-card" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-light)', fontWeight: 600 }}>{d.display_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                "{d.dream_excerpt}"
              </p>
              {d.interpretation_excerpt && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  ✦ {d.interpretation_excerpt}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="symbols-grid">
                  {(d.emotions || []).slice(0, 2).map((e, i) => <span key={i} className="symbol-tag">{e}</span>)}
                </div>
                <button onClick={() => handleLike(d.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  💜 {d.likes_count || 0}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- DREAM TRAINING ----
function LucidTraining({ user, onAuthClick }) {
  const [progress, setProgress] = useState(null)
  const [activeTechnique, setActiveTechnique] = useState(null)

  useEffect(() => {
    if (user) loadProgress()
  }, [user])

  const loadProgress = async () => {
    const p = await getLucidProgress()
    setProgress(p)
  }

  const doRealityCheck = async () => {
    if (!user) { onAuthClick(); return }
    const newCount = (progress?.reality_checks_today || 0) + 1
    await updateLucidProgress({ reality_checks_today: newCount, last_reality_check: new Date().toISOString() })
    setProgress(prev => ({ ...prev, reality_checks_today: newCount }))
  }

  const techniques = [
    {
      id: 'mild', name: 'MILD', fullName: 'Mnemonic Induction of Lucid Dreams', difficulty: 'Beginner',
      steps: [
        'As you fall asleep, repeat: "Tonight I will realize I\'m dreaming"',
        'Visualize yourself in a recent dream, but this time recognizing it\'s a dream',
        'Focus on the intention to remember you\'re dreaming',
        'If you wake during the night, repeat the process before falling back asleep',
      ],
      tip: 'This works best when combined with a dream journal. The more dreams you record, the better MILD works.',
    },
    {
      id: 'wbtb', name: 'WBTB', fullName: 'Wake Back To Bed', difficulty: 'Intermediate',
      steps: [
        'Set an alarm for 5-6 hours after you fall asleep',
        'When you wake, stay up for 20-30 minutes. Read about lucid dreaming.',
        'Go back to sleep with the strong intention to recognize you\'re dreaming',
        'You\'ll enter REM sleep quickly — this is when lucid dreams happen',
      ],
      tip: 'This is the most scientifically validated technique. Combine with MILD for best results.',
    },
    {
      id: 'reality', name: 'Reality Checks', fullName: 'Reality Testing', difficulty: 'Beginner',
      steps: [
        'Throughout the day, pause and ask: "Am I dreaming right now?"',
        'Look at your hands — in dreams, they often look distorted',
        'Try pushing your finger through your palm — in dreams, it might pass through',
        'Check the time twice — in dreams, clocks often change between looks',
        'Do this 10-15 times daily. The habit will carry into dreams.',
      ],
      tip: 'The key is genuine questioning, not just going through the motions. Really consider the possibility each time.',
    },
    {
      id: 'wild', name: 'WILD', fullName: 'Wake Initiated Lucid Dream', difficulty: 'Advanced',
      steps: [
        'Lie still as you fall asleep. Keep your mind awake while your body drifts off.',
        'You may feel vibrations, hear sounds, or see patterns — this is normal (hypnagogia)',
        'Don\'t react or move. Let the dream form around you.',
        'You\'ll transition directly from waking into a lucid dream',
      ],
      tip: 'This is the hardest technique but the most rewarding. Best attempted during WBTB wake periods, not at initial bedtime.',
    },
  ]

  return (
    <div className="journal-container" style={{ maxWidth: '750px' }}>
      <div className="text-center">
        <div className="section-label">Dream Training</div>
        <h2 className="section-title">Learn to Control Your Dreams</h2>
        <p className="section-desc mx-auto">Master proven techniques to become aware inside your dreams.</p>
      </div>

      {/* Reality Check Button */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button className="btn btn-primary btn-large" onClick={doRealityCheck} style={{ fontSize: '1.1rem' }}>
          👋 Reality Check Now
        </button>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          Today: {progress?.reality_checks_today || 0} checks • Goal: 10-15/day
        </p>
        <div className="mood-bar" style={{ maxWidth: '300px', margin: '0.5rem auto 0' }}>
          <div className="mood-fill" style={{ width: `${Math.min(100, ((progress?.reality_checks_today || 0) / 15) * 100)}%` }} />
        </div>
      </div>

      {/* Techniques Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '2.5rem' }}>
        {techniques.map(t => (
          <div key={t.id} className="feature-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTechnique(activeTechnique === t.id ? null : t.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>{t.name}</h3>
              <span className="symbol-tag" style={{ fontSize: '0.7rem' }}>{t.difficulty}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{t.fullName}</p>

            {activeTechnique === t.id && (
              <div style={{ marginTop: '1rem', animation: 'slideIn 0.3s ease' }}>
                <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {t.steps.map((s, i) => (
                    <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{s}</li>
                  ))}
                </ol>
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(139,92,246,0.08)', borderRadius: '8px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--accent-light)' }}>💡 {t.tip}</p>
                </div>
              </div>
            )}

            {activeTechnique !== t.id && (
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-light)', marginTop: '0.25rem' }}>Tap to learn →</p>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      {progress && (
        <div className="journal-stats" style={{ marginTop: '2.5rem' }}>
          <div className="journal-stat-card"><div className="journal-stat-value">{progress.lucid_dream_count || 0}</div><div className="journal-stat-label">Lucid Dreams</div></div>
          <div className="journal-stat-card"><div className="journal-stat-value">{progress.reality_checks_today || 0}</div><div className="journal-stat-label">Checks Today</div></div>
          <div className="journal-stat-card"><div className="journal-stat-value">{progress.streak_days || 0}🔥</div><div className="journal-stat-label">Streak</div></div>
          <div className="journal-stat-card"><div className="journal-stat-value">{(progress.techniques_completed || []).length}</div><div className="journal-stat-label">Techniques</div></div>
        </div>
      )}
    </div>
  )
}

// ---- PRIVACY SECTION (for landing page) ----
function PrivacySection() {
  return (
    <section>
      <div className="text-center">
        <div className="section-label">Your Privacy</div>
        <h2 className="section-title">Your Dreams Are Sacred</h2>
        <p className="section-desc mx-auto">We take dream privacy seriously. Your most intimate thoughts deserve protection.</p>
      </div>
      <div className="features-grid" style={{ marginTop: '2rem' }}>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>End-to-End Private</h3>
          <p>Your dreams are encrypted and only visible to you. We never sell, share, or use your dream data for training.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🫥</div>
          <h3>Anonymous Sharing</h3>
          <p>When you share dreams to the community feed, your identity is always hidden. Share only what you're comfortable with.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🗑️</div>
          <h3>Delete Anytime</h3>
          <p>Your data, your rules. Delete any dream or your entire account at any time. We wipe everything permanently.</p>
        </div>
      </div>
    </section>
  )
}

function Footer() { return <footer className="footer"><p>© 2026 NightMind. AI-powered dream interpretation. Patent Pending. Your dreams are private.</p></footer> }

// ================================================================
// MAIN APP
// ================================================================
function App() {
  const [view, setView] = useState('home')
  const [result, setResult] = useState(null)
  const [showShare, setShowShare] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [showPushBanner, setShowPushBanner] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      if (session?.user) loadProfile()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) loadProfile()
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Show push notification banner after first dream interpretation
  useEffect(() => {
    if (result && user && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => setShowPushBanner(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [result, user])

  const loadProfile = async () => { const p = await getProfile(); setProfile(p) }

  const navigate = (v) => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const handleResult = (r) => { setResult(r); setView('result'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const handleSignOut = async () => { await signOut(); setUser(null); setProfile(null); navigate('home') }

  const handleEmailGateAuth = (data) => {
    setUser(data.user)
    loadProfile()
  }

  const handleUpgrade = () => {
    if (!user) { setShowAuth(true); return }
    navigate('pricing')
  }

  return (
    <>
      <div className="stars-bg" />
      <div className="app-container">
        <Nav onNavigate={navigate} user={user} onAuthClick={() => setShowAuth(true)} onSignOut={handleSignOut} />

        {view === 'home' && (<><Hero onNavigate={navigate} /><HowItWorks /><Features /><Testimonials /><PrivacySection /><Pricing onNavigate={navigate} user={user} profile={profile} onAuthClick={() => setShowAuth(true)} /><CTASection onNavigate={navigate} /></>)}

        {view === 'interpret' && (
          <div style={{ paddingTop: '5rem' }}>
            <DreamInterpreter user={user} onResult={handleResult} onAuthClick={() => setShowAuth(true)} onEmailGateAuth={handleEmailGateAuth} />
          </div>
        )}

        {view === 'result' && result && (
          <div style={{ paddingTop: '5rem' }}>
            <ResultCard result={result} onShare={() => setShowShare(true)} onNew={() => { setResult(null); navigate('interpret') }} profile={profile} onUpgrade={handleUpgrade} />
            {user && result.id && (
              <div className="interpret-section" style={{ paddingTop: 0 }}>
                <DreamChat dreamId={result.id} dreamText={result.summary} user={user} profile={profile} onUpgrade={handleUpgrade} />
              </div>
            )}
          </div>
        )}

        {view === 'journal' && (
          <div style={{ paddingTop: '5rem' }}>
            <CalendarJournal onNavigate={navigate} profile={profile} onUpgrade={handleUpgrade} />
          </div>
        )}

        {view === 'community' && (
          <div style={{ paddingTop: '5rem' }}>
            <CommunityFeed user={user} onAuthClick={() => setShowAuth(true)} />
          </div>
        )}

        {view === 'lucid' && (
          <div style={{ paddingTop: '5rem' }}>
            <LucidTraining user={user} onAuthClick={() => setShowAuth(true)} />
          </div>
        )}

        {view === 'pricing' && (
          <div style={{ paddingTop: '5rem' }}>
            <Pricing onNavigate={navigate} user={user} profile={profile} onAuthClick={() => setShowAuth(true)} />
          </div>
        )}

        <Footer />
        {showShare && result && <ShareCard result={result} onClose={() => setShowShare(false)} />}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={(data) => { setUser(data.user); loadProfile() }} />}
        {showPushBanner && <PushBanner onDismiss={() => setShowPushBanner(false)} />}
      </div>
    </>
  )
}

export default App
