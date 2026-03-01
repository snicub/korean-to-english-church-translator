# Korean → English Live Sermon Translator

Real-time Korean sermon transcription and English translation for church services. The pastor speaks Korean; the congregation sees clean English on screen, sentence by sentence.

## How it works

1. Browser captures microphone audio in configurable chunks (20/25/30s max)
2. Each chunk is sent to **Groq Whisper** for Korean transcription
3. The Korean text is sent to **Claude** for natural English translation
4. Translated sentences appear live on the display

Optional **VAD (Voice Activity Detection)** can cut chunks early on speech pauses, reducing latency from ~30s to ~8-15s. Off by default — longer chunks produce higher quality translations.

The translator handles theological vocabulary, scripture references (e.g. 요한복음 3장 16절 → John 3:16), music detection, hallucination filtering, and maintains context across segments via a sliding window + rolling summary.

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

See **[SETUP.md](SETUP.md)** for a detailed walkthrough with UI instructions.

Quick start:
1. Open the app on the display computer (full-screen the browser)
2. Click the gear icon (bottom right) to open the Admin Console
3. Click **Begin** — allow microphone access
4. Translation appears on screen as the pastor speaks
5. Click **Stop** when done — transcript downloads automatically

### Admin Console features

- **Pop out** — pop the console out to a second monitor, freeing the main screen for the sermon text
- **Max** — chunk duration ceiling (20s / 25s / 30s); longer = better accuracy, more latency
- **VAD** — Voice Activity Detection; cuts chunks on speech pauses for lower latency (off by default)
- **Size / Line / Segment** — live typography controls: font size, line spacing, and segment gap
- **Scroll** — auto-scroll speed (teleprompter-style smooth scrolling)
- **Clear** — pushes text off-screen (visual only; sermon context is preserved)
- **Download** — save transcript as `.txt` at any time

### Session lifecycle

- **Start** — wipes all context and Redis for a clean slate, then opens mic
- **Clear** — visual only; makes the screen black but keeps sermon context for translation continuity
- **Stop** — tears down mic, then wipes context and Redis after 2s

### Editing the transcript

Click any sentence on screen to edit it in place. Auto-scroll pauses while you type. The corrected text is saved in the downloaded transcript.

## Models

| Task | Model |
|------|-------|
| Transcription | `whisper-large-v3` (Groq) |
| Translation | `claude-sonnet-4-6` (Anthropic) |
| Background summary | `claude-haiku-4-5` (Anthropic) |
