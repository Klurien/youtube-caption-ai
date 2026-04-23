import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getYouTubeID } from '@/lib/youtube'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { YouTubeTranscriptApi } from 'youtube-transcript-api-js'
import axios from 'axios'
import { downloadAudioBuffer } from '@/lib/audio'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

const SCRAPINGBEE_API_URL = 'https://api.scrapingbee.com/v1/'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    const youtubeId = getYouTubeID(url)

    if (!youtubeId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Initialize tables
    await query(`
      CREATE TABLE IF NOT EXISTS videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        youtube_id VARCHAR(50) UNIQUE NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        transcript TEXT,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 1. Cache Check
    const videos: any = await query('SELECT * FROM videos WHERE youtube_id = ? LIMIT 1', [youtubeId])
    const existingVideo = videos[0]

    if (existingVideo) {
      return NextResponse.json({ summary: existingVideo.summary, cached: true })
    }

    // 2. Transcript Fetching
    let transcriptText = ''
    try {
      // First attempt: Free library (native)
      const api = new YouTubeTranscriptApi()
      const fetchedTranscript = await api.fetch(youtubeId)
      transcriptText = fetchedTranscript.toRawData().map((t: any) => t.text).join(' ')
    } catch (err) {
      console.warn('Native transcript fetch failed, trying ScrapingBee...')
      
      // Fallback: ScrapingBee (using free trial credits if provided)
      if (process.env.PROXY_API_KEY) {
        try {
          const response = await axios.get(SCRAPINGBEE_API_URL, {
            params: {
              api_key: process.env.PROXY_API_KEY,
              url: `https://www.youtube.com/watch?v=${youtubeId}`,
              extract_rules: { transcript: '.ytp-caption-segment' }
            }
          })
          transcriptText = response.data.transcript || ''
        } catch (sErr) {
          console.error('All transcript fetch attempts failed')
        }
      }
    }

    let summary = ''
    if (transcriptText && !transcriptText.includes('failed')) {
      // 3a. Summarization from Text
      const prompt = `Summarize this YouTube transcript into 3 key takeaways and a 5-bullet detailed breakdown. Use Markdown.\n\nTranscript: ${transcriptText}`
      const result = await model.generateContent(prompt)
      summary = result.response.text()
    } else {
      // 3b. Fallback: Summarization from Audio (STT)
      console.log('Transcript missing, falling back to Audio STT...')
      try {
        const audioBuffer = await downloadAudioBuffer(youtubeId)
        const result = await model.generateContent([
          {
            inlineData: {
              data: audioBuffer.toString('base64'),
              mimeType: 'audio/mp4'
            }
          },
          'Summarize this YouTube video audio into 3 key takeaways and a 5-bullet detailed breakdown. Use Markdown.'
        ])
        summary = result.response.text()
        transcriptText = '[Audio STT Summary]' // Placeholder for DB
      } catch (audioErr: any) {
        console.error('Audio STT failed:', audioErr)
        let errorMessage = 'Failed to transcribe and summarize video audio.'
        if (audioErr.message?.includes('Video unavailable')) {
          errorMessage = 'This video is unavailable or restricted.'
        } else if (audioErr.message?.includes('503')) {
          errorMessage = 'The AI service is currently overloaded. Please try again in a few moments.'
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    }

    // 4. Persistence
    await query(
      'INSERT INTO videos (youtube_id, url, transcript, summary) VALUES (?, ?, ?, ?)',
      [youtubeId, url, transcriptText, summary]
    )

    return NextResponse.json({ summary, cached: false })

  } catch (error: any) {
    console.error('Summarize error:', error)
    
    // Check for specific Gemini errors
    if (error.message?.includes('503')) {
      return NextResponse.json({ error: 'Gemini AI is temporarily unavailable (503). Please try again soon.' }, { status: 503 })
    }
    if (error.message?.includes('404')) {
      return NextResponse.json({ error: 'AI model configuration error. Please contact support.' }, { status: 500 })
    }

    return NextResponse.json({ error: error.message || 'Failed to summarize video' }, { status: 500 })
  }
}
