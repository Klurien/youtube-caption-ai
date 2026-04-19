'use client'

import { useState } from 'react'
import { Video, Search, Sparkles, Loader2, ArrowRight, Share2, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import axios from 'axios'

export default function Home() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState('Fetching transcript...')

  const handleSummarize = async () => {
    if (!url) return
    setLoading(true)
    setSummary(null)
    setError(null)
    setLoadingStep('Accessing YouTube data...')

    try {
      // Simulate step updates for better UX
      setTimeout(() => setLoadingStep('Analyzing video content...'), 1500)
      setTimeout(() => setLoadingStep('Gemini is thinking...'), 3500)

      const response = await axios.post('/api/summarize', { url })
      setSummary(response.data.summary)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container">
      <div className="glow-bg" />
      
      <header>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1>NovaCap AI</h1>
          <p className="subtitle">
            Scale your learning. Summarize any YouTube video in seconds with Gemini 1.5 Flash.
          </p>
        </motion.div>
      </header>

      <section className="search-section">
        <motion.div 
          className="search-container"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Video className="icon" size={24} color="#5c62ec" style={{ marginLeft: '1rem' }} />
          <input 
            type="text" 
            placeholder="Paste YouTube URL here..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <button onClick={handleSummarize} disabled={loading || !url}>
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Summarize <ArrowRight size={18} />
              </span>
            )}
          </button>
        </motion.div>
      </section>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            key="loading"
            className="loading-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="spinner" />
            <p style={{ color: 'var(--accent)', fontWeight: '600' }}>{loadingStep}</p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ color: '#ff4b4b', textAlign: 'center', padding: '1rem' }}
          >
            {error}
          </motion.div>
        )}

        {summary && !loading && (
          <motion.div 
            key="summary"
            className="summary-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Sparkles size={24} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Key Takeaways</h3>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="secondary-btn" style={{ background: 'var(--border)', padding: '0.5rem 1rem' }}>
                  <Share2 size={18} />
                </button>
                <button className="secondary-btn" style={{ background: 'var(--border)', padding: '0.5rem 1rem' }}>
                  <Download size={18} />
                </button>
              </div>
            </div>
            
            <div className="summary-content">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ marginTop: 'auto', padding: '4rem 0 2rem', textAlign: 'center', color: 'var(--muted)' }}>
        <p>© 2026 NovaCap AI. Powered by Gemini 1.5 Flash.</p>
      </footer>

      <style jsx>{`
        .search-section {
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }
        .icon {
          align-self: center;
        }
        .secondary-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
      `}</style>
    </main>
  )
}
