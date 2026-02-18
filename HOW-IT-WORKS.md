# How the Sermon Translator Works
### A plain-English guide for non-technical readers

---

## What It Does

A pastor speaks in **Korean**. Within about 35–45 seconds, the English translation appears on a display screen — broken into clean, readable sentences — updated live throughout the entire service.

A second person can follow along and control the display from their **phone**, on the same Wi-Fi or mobile data, anywhere in the world.

---

## The Big Picture

```
  PASTOR SPEAKS (Korean)
          │
          ▼
  ┌───────────────────┐
  │   Laptop Mic      │  Records 30-second chunks of audio
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────┐
  │   Groq Whisper    │  AI #1 — converts speech to text (Korean)
  │   (transcription) │  ~2–5 seconds
  └────────┬──────────┘
           │  Korean text
           ▼
  ┌───────────────────┐
  │   Claude Sonnet   │  AI #2 — translates Korean → English
  │   (translation)   │  ~3–8 seconds
  └────────┬──────────┘
           │  English sentences
           ▼
  ┌───────────────────────────────────────┐
  │         Display Screen (Laptop)        │
  │  Large white text on black background  │
  │  Auto-scrolls as new text arrives      │
  └────────┬──────────────────────────────┘
           │  Pushes each entry to cloud storage
           ▼
  ┌───────────────────┐
  │   Upstash Redis   │  Cloud "bulletin board" — stores the
  │   (sync store)    │  current transcript and session state
  └────────┬──────────┘
           │  Phone polls every 1.5 seconds
           ▼
  ┌───────────────────┐
  │   Phone (Remote)  │  Displays same transcript + admin controls
  └───────────────────┘
```

---

## The Three AI Models

### 1. Groq Whisper — "The Ears"
> **What it does:** Listens to the audio recording and writes down exactly what was said, in Korean.

| | |
|---|---|
| **Full name** | OpenAI Whisper Large v3, running on Groq's servers |
| **Why Groq?** | Groq runs Whisper at extreme speed — what normally takes 10–20 seconds is done in 2–5 seconds. Every second saved means the translation appears sooner. |
| **Why Whisper Large v3?** | It's the most accurate publicly available speech-to-text model, especially for languages like Korean. Smaller/cheaper models make significantly more errors on Korean. |
| **A clever trick** | Before processing a new chunk, we feed Whisper the last thing it heard as a "hint." This helps it recognise recurring theological words (하나님, 예수님, etc.) consistently across the whole sermon. |

---

### 2. Claude Sonnet — "The Translator"
> **What it does:** Reads the Korean text and writes a natural, fluent English translation, broken into individual sentences.

| | |
|---|---|
| **Full name** | Anthropic Claude Sonnet (latest version) |
| **Why Claude?** | Claude produces significantly more natural-sounding English than other models on nuanced, theological Korean. It understands context, completes cut-off thoughts, and avoids robotic phrasing. |
| **Why Sonnet (not Haiku or Opus)?** | Sonnet hits the sweet spot — Haiku is too fast/simple and produces stiffer translations; Opus costs 5× more with only marginal improvement for this task. |
| **Context window** | Claude sees the last 8 translated segments as background context, so it maintains consistent terminology and can complete a sentence that was cut off mid-speech by the 30-second chunk boundary. |
| **Special rules given to Claude** | Remove filler words (um, uh, 그, 이제…); preserve theological terms correctly; detect if the audio is just music/singing (no translation needed); never start a sentence with a stray apostrophe from a chunk cut. |

---

### 3. Claude Haiku — "The Summariser" *(background)*
> **What it does:** Every 8 segments, quietly writes a 3-sentence summary of the sermon so far. This summary is fed back to the Translator as background context.

| | |
|---|---|
| **Full name** | Anthropic Claude Haiku |
| **Why a separate model?** | This task is simple (summarise text you already have), so the smallest, fastest, cheapest model is fine. No need for Sonnet's quality here. |
| **Why bother?** | As a sermon gets longer (30+ minutes), the Translator can't hold the entire sermon in memory. The summary acts like "what has this sermon been about so far?" — keeping translations consistent with earlier themes. |

---

## Timing Breakdown

From the moment the pastor speaks a sentence to when it appears on screen:

```
  0s ──────────────────────────────────────────────────────── ~45s

  [Recording 30s chunk ──────────────────]
                                          [Whisper: 2–5s]
                                                         [Claude: 3–8s]
                                                                       ▲
                                                                  Text appears
```

| Step | Typical time |
|---|---|
| Audio chunk recording | 30 seconds (configurable: 20s / 25s / 30s) |
| Upload + Whisper transcription | 2–5 seconds |
| Claude translation | 3–8 seconds |
| **Total delay from speech → screen** | **~35–45 seconds** |
| Phone refresh lag (after laptop gets it) | up to 1.5 seconds |

> **Why 30-second chunks?**
> Shorter chunks (10–15s) feel faster, but very short clips often don't have enough context for Whisper to transcribe accurately — especially mid-sentence. 30 seconds gives both AIs enough material to produce a clean, complete translation.

---

## The Phone Sync System

```
  LAPTOP                         CLOUD (Upstash Redis)         PHONE
    │                                     │                      │
    │── New entry translated ────────────▶│                      │
    │                                     │◀─ "Anything new?" ───│  (every 1.5s)
    │                                     │── Here are entries ─▶│
    │                                     │                      │
    │◀─ "Anything new?" ──────────────────│◀─ "Start recording" ─│  (command)
    │── Starts recording                  │                      │
    │── Records status: Live ────────────▶│                      │
    │                                     │◀─ "Anything new?" ───│
    │                                     │── Status: Live ─────▶│  (status update)
```

**What's stored in the cloud (Redis):**
- The full transcript (up to 500 entries)
- Current session state (Live / Ready)
- Any text edits made from either device

**Two-way editing:** If you fix a typo on the phone, it syncs to the laptop. If you fix it on the laptop, it syncs to the phone. The last edit wins.

---

## Edge Cases the System Handles

| Situation | What happens |
|---|---|
| **Silence or no speech** | Chunks under 8 KB are automatically skipped — no blank translations |
| **Music / worship singing** | Claude detects this and shows a small music label instead of trying to translate lyrics |
| **Sentence cut off mid-chunk** | The tail of the previous translation is sent to Claude as context, so the next chunk continues naturally |
| **Stray apostrophe at start** | A system rule tells Claude never to begin with `'` or `"`, and a backup cleanup strips it if Claude forgets |
| **Multiple chunks queued up** | Chunks are processed one at a time in order (a queue), never in parallel — this prevents jumbled output |
| **Network timeout** | Both Whisper and Claude calls retry up to 3 times with increasing wait between attempts |
| **Page refreshed / closed** | The transcript is auto-saved as a `.txt` file the moment the page is closed |

---

## Platform & Hosting

| Component | Provider | Notes |
|---|---|---|
| Website hosting | **Netlify** | Free tier; auto-deploys when code changes |
| API calls (proxy) | **Netlify Functions** | Serverless — no always-on server needed |
| Transcript sync | **Upstash Redis** | Serverless key-value store; ~$0 at this usage level |
| Speech-to-text | **Groq API** | Pay-per-second of audio |
| Translation + summary | **Anthropic API** | Pay-per-token (words processed) |

> **Cost per Sunday:** At typical sermon lengths (45–60 min), estimated API cost is **$0.50–$2.00 per service**, dominated by Claude Sonnet translation calls.

---

## What the Operator Sees

**Laptop (main display)**
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   In the ancient city of Philippi, Rome had             │
│   established a colony where retired soldiers            │
│   were given homes and a place to call their own.       │
│                                                          │
│   The Apostle Paul wrote to this church not from         │
│   a palace, but from a prison cell.                      │
│                                                          │
│                                                          │
│                                              ⚙  [gear]  │
└──────────────────────────────────────────────────────────┘
                                    ▲ clicking ⚙ opens admin panel
```

**Phone (remote view)** — normally just the transcript; tap ⚙ to reveal controls:
```
┌─────────────────────────────────┐
│ ⚙  [gear — tap to show controls]│  ← always visible
├─────────────────────────────────┤  ← panel slides down on tap
│ ○ Ready  ▶ Begin  ■ Stop  Clear │
│ ↓ Download  ↓ Follow            │
│ Segment: [30s ▾]  Size ──●──    │
│ Spacing ────●──  Scroll ──●──   │
├─────────────────────────────────┤
│                                 │
│   In the ancient city of        │
│   Philippi, Rome had            │
│   established a colony…         │
│                                 │
└─────────────────────────────────┘
```
