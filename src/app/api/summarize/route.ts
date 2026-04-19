import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getYouTubeID } from '@/lib/youtube'
import axios from 'axios'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    const youtubeId = getYouTubeID(url)

    if (!youtubeId) {
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // Initialize tables if they don't exist
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

    // 2. Transcript Fetching (Mocked/Proxy logic)
    const transcript = "This is a simulated transcript for the video. In a real-world application, " + 
                       "you would fetch the actual captions from YouTube using a proxy API to avoid rate limiting."
    
    // 3. Summarization with DeepSeek
    const deepseekResponse = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "Summarize this YouTube transcript into 3 key takeaways and a 5-bullet detailed breakdown. Use Markdown." },
          { role: "user", content: transcript }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const summary = deepseekResponse.data.choices[0].message.content

    // 4. Persistence
    await query(
      'INSERT INTO videos (youtube_id, url, transcript, summary) VALUES (?, ?, ?, ?)',
      [youtubeId, url, transcript, summary]
    )

    return NextResponse.json({ summary, cached: false })

  } catch (error: any) {
    console.error('Summarize error:', error)
    return NextResponse.json({ error: error.message || 'Failed to summarize video' }, { status: 500 })
  }
}
