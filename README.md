# Korean → English Live Sermon Translator

Real-time Korean sermon transcription and English translation for church services. The pastor speaks Korean; the congregation sees clean English on screen, sentence by sentence.

## How it works

1. Browser captures microphone audio in 30-second chunks
2. Each chunk is sent to **Groq Whisper** for Korean transcription
3. The Korean text is sent to **Claude** for natural English translation
4. Translated sentences appear live on the display

The translator handles theological vocabulary, scripture references (e.g. 요한복음 3장 16절 → John 3:16), music detection, and maintains context across segments for continuity.

## Stack

- `index.html` — single-file frontend (no build step)
- `netlify/functions/groq.js` — proxy to Groq Whisper API
- `netlify/functions/claude.js` — proxy to Anthropic Claude API
- Deployed on **Netlify**

## Setup

### 1. Get API keys

- **Groq**: [console.groq.com](https://console.groq.com) → API Keys
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com) → API Keys

### 2. Local development

```bash
npm install -g netlify-cli

# Create .env in project root
echo "GROQ_KEY=your_groq_key" >> .env
echo "ANTHROPIC_KEY=your_anthropic_key" >> .env

netlify dev
# → http://localhost:8888
```

### 3. Deploy to Netlify

```bash
netlify deploy --prod
```

Set `GROQ_KEY` and `ANTHROPIC_KEY` in **Netlify → Site settings → Environment variables**.

## Usage

1. Open the app on the display computer (full-screen the browser)
2. Click **⚙** (bottom right) to open the Admin Console
3. Click **▶ Begin** — allow microphone access
4. Translation appears on screen as the pastor speaks
5. Click **■ Stop** when done — transcript downloads automatically

### Admin Console features

- **↗** — pop the console out to a second monitor, freeing the main screen for the sermon text
- **Segment** — chunk duration (20s / 25s / 30s); longer = better accuracy, more latency
- **Size / Line / Chunk** — live typography controls: font size, sentence spacing, and segment gap
- **Scroll** — auto-scroll speed (teleprompter-style smooth scrolling)
- **Clear** — wipe transcript and start fresh
- **↓ Download** — save transcript as `.txt` at any time

### Editing the transcript

Click any sentence on screen to edit it in place. Auto-scroll pauses while you type. The corrected text is saved in the downloaded transcript.

## Models

| Task | Model |
|------|-------|
| Transcription | `whisper-large-v3` (Groq) |
| Translation | `claude-sonnet-4-6` (Anthropic) |
| Background summary | `claude-haiku-4-5` (Anthropic) |
