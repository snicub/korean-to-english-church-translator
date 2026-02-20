# How the Sermon Translator Works
### A plain-English guide for non-technical readers

---

## What It Does

A pastor speaks in **Korean**. On average within about **18 seconds** (worst case ~30s), the English translation appears on a display screen — broken into clean, readable sentences — updated live throughout the entire service.

A second person can follow along and control the display from their **phone**, on the same Wi-Fi or mobile data, anywhere in the world.

---

## The Big Picture

```
  PASTOR SPEAKS (Korean)
          │
          ▼
  ┌───────────────────┐
  │   Laptop Mic      │  Records audio in chunks (20 / 25 / 30s, configurable)
  └────────┬──────────┘
           │  [mute gate — discards chunk silently if muted]
           ▼
  ┌───────────────────┐
  │   Groq Whisper    │  AI #1 — converts speech to text (Korean)
  │   (transcription) │  ~2–5 seconds
  └────────┬──────────┘
           │  Korean text
           │  [hallucination filter — discards if repeated bigram detected 3+ times]
           ▼
  ┌───────────────────┐
  │   Claude Sonnet   │  AI #2 — translates Korean → English
  │   (translation)   │  ~3–8 seconds
  └────────┬──────────┘
           │  English sentences (editable inline)
           ▼
  ┌───────────────────────────────────────┐
  │         Display Screen (Laptop)        │
  │  Large white text on black background  │
  │  Sermon title shown at top (if set)    │
  │  Auto-scrolls as new text arrives      │
  └────────┬──────────────────────────────┘
           │  Pushes each entry + session state + typography to cloud
           ▼
  ┌───────────────────┐
  │   Upstash Redis   │  Cloud "bulletin board" — stores transcript,
  │   (sync store)    │  session state, typography, title, mute, commands
  └────────┬──────────┘
           │  Phone polls every 1.5s; Laptop polls every 3s
           │  (single endpoint returns everything: entries, edits, typo, commands)
           ▼
  ┌───────────────────┐
  │   Phone (Remote)  │  Displays same transcript + full admin controls
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
| **Context hint** | After the first segment, Whisper is given the previous segment's Korean text as a hint — this helps it recognise recurring theological words consistently. No hint is sent for the very first segment (sending domain keyword lists causes hallucinations on silence). |
| **Hallucination filter** | When audio is quiet, Whisper sometimes invents repeated phrases. Any transcription where a consecutive word-pair (bigram) appears 3 or more times is automatically discarded before reaching Claude. A threshold of 3 avoids false positives on naturally repeated phrases like "the Lord" that may appear twice in real speech. |
| **MIME type caching** | The browser's best supported audio format (`audio/webm;codecs=opus`, etc.) is detected once per session and cached — not re-checked on every chunk. |

---

### 2. Claude Sonnet — "The Translator"
> **What it does:** Reads the Korean text and writes a natural, fluent English translation, broken into individual sentences.

| | |
|---|---|
| **Full name** | Anthropic Claude Sonnet (latest version) |
| **Why Claude?** | Claude produces significantly more natural-sounding English than other models on nuanced, theological Korean. It understands context, completes cut-off thoughts, and avoids robotic phrasing. |
| **Why Sonnet (not Haiku or Opus)?** | Sonnet hits the sweet spot — Haiku is too fast/simple and produces stiffer translations; Opus costs 5× more with only marginal improvement for this task. |
| **Context window** | Claude sees the last **3** translated segments as background context (reduced from 8 — ~60% fewer input tokens with negligible quality loss), plus a rolling sermon summary for long-term thematic consistency. It also receives the tail of the previous translation so it can continue a sentence that was cut off mid-speech by the chunk boundary. |
| **Max output tokens** | Capped at 400 (a 20-second chunk rarely produces more than ~150 tokens of English). |
| **Special rules given to Claude** | Remove filler words (um, uh, 그, 이제…); preserve theological terms correctly; only label a segment as music if it is *purely instrumental* with no words — brief congregational responses like 아멘 are translated as speech; never start a sentence with a stray apostrophe from a chunk cut. |

---

### 3. Claude Haiku — "The Summariser" *(background)*
> **What it does:** Every 8 segments, quietly writes a 3-sentence summary of the sermon so far. This summary is fed back to the Translator as background context.

| | |
|---|---|
| **Full name** | Anthropic Claude Haiku |
| **Why a separate model?** | This task is simple (summarise text you already have), so the smallest, fastest, cheapest model is fine. No need for Sonnet's quality here. |
| **Why bother?** | As a sermon gets longer (30+ minutes), the Translator can't hold the entire sermon in memory. The summary acts like "what has this sermon been about so far?" — keeping translations consistent with earlier themes. |
| **Incremental approach** | The first summary call receives just the first 8 segments. Every subsequent call receives the *previous summary + only the latest 8 segments* — not the entire transcript. This keeps Haiku's input at a roughly constant size (~500–900 tokens) instead of growing linearly with sermon length. Over a 60-minute sermon, this is **~5–9× fewer tokens** than sending everything each time. |

---

## Timing Breakdown

From the moment the pastor speaks a sentence to when it appears on screen:

```
  0s ──────────────────────────────────────── ~28s
                                                  (average ~18s from speech)
  [Recording 20s chunk ──────────]
                                  [Whisper: 2–5s]
                                                 [Claude: 3–8s]
                                                               ▲
                                                          Text appears
```

| Step | Typical time |
|---|---|
| Audio chunk recording | **20 seconds** (default; configurable: 20s / 25s / 30s) |
| Upload + Whisper transcription | 2–5 seconds |
| Claude translation | 3–8 seconds |
| **Worst case (speech at chunk start)** | **~28–33 seconds** |
| **Average (speech mid-chunk)** | **~18 seconds** |
| **Best case (speech at chunk end)** | **~5 seconds** |
| Phone refresh lag (after laptop gets it) | up to 1.5 seconds |

> **Why 20-second chunks?**
> Shorter chunks (10–15s) feel faster, but very short clips often don't have enough context for Whisper to transcribe accurately — especially mid-sentence. 20 seconds is the sweet spot — enough material for clean transcription while keeping the average delay under 20 seconds. Longer options (25s / 30s) are available for situations where accuracy matters more than speed.

---

## The Phone Sync System

```
  LAPTOP                         CLOUD (Upstash Redis)         PHONE
    │                                     │                      │
    │── New entry translated ────────────▶│                      │
    │── Typography / title / mute ───────▶│                      │
    │                                     │◀─ "Anything new?" ───│  (every 1.5s)
    │                                     │── Entries + state ──▶│
    │                                     │── Typography ───────▶│
    │                                     │── Commands ─────────▶│
    │                                     │                      │
    │                                     │◀─ "Mute" / "Start" ──│  (command POST)
    │                                     │                      │
    │◀─ Single poll (entries+edits+  ────│                      │
    │   typo+commands in one fetch)       │                      │
    │── Applies command if new            │                      │
    │── Pushes updated state ────────────▶│                      │
    │                                     │◀─ "Anything new?" ───│
    │                                     │── Updated state ────▶│  (phone button updates)
```

**Single-endpoint polling:** Both the laptop and phone poll the same `/api/sync-pull` endpoint. The server returns entries, session state, edits, typography, *and* the latest command — all in a single Redis pipeline (one HTTP round-trip). The laptop previously made two separate fetches (one for commands, one for sync); now it's just one.

**What's stored in the cloud (Redis):**
- The full transcript (up to 500 entries)
- Current session state (Live / Ready / Muted)
- Sermon title
- Typography settings (font size, spacing, scroll speed, segment length) — synced to all devices
- Any text edits made from either device
- Latest remote command (start, stop, mute, unmute, clear, setChunkMs)

**Two-way typography sync:** Changing font size on the phone updates the laptop display and vice versa. All devices stay in sync within 1–3 seconds. A 1.5-second grace period prevents polls from overwriting a slider that's being actively dragged.

**Two-way editing:** If you fix a typo on the phone, it syncs to the laptop. If you fix it on the laptop, it syncs to the phone. The last edit wins.

---

## Edge Cases the System Handles

| Situation | What happens |
|---|---|
| **Silence or no speech** | Chunks under 8 KB are automatically skipped — no blank translations |
| **Whisper hallucination on silence** | If Whisper outputs a repeated phrase (e.g. "예수님 성경을 믿고 예수님 성경을 믿고…"), a bigram-frequency detector catches any word-pair appearing 3+ times and discards the transcription before translation |
| **Music / worship singing** | Claude detects clearly instrumental audio and shows a small music label. Brief congregational responses (아멘, 할렐루야) are translated as speech, not labelled as music |
| **Sentence cut off mid-chunk** | The tail of the previous translation is sent to Claude as context, so the next chunk continues naturally |
| **Stray apostrophe at start** | A system rule tells Claude never to begin with `'` or `"`, and a backup cleanup strips it if Claude forgets |
| **Multiple chunks queued up** | Chunks are processed one at a time in order (a queue), never in parallel — this prevents jumbled output |
| **Network timeout** | Both Whisper and Claude calls retry up to 3 times with increasing wait between attempts |
| **Slider drag overwritten by sync** | A 1.5-second grace period prevents the background poll from resetting a control while the user is actively dragging it |
| **Duplicate entries on rapid polls** | Phone-side rendering skips entries whose ID already exists in the DOM |
| **Remote reads stale hidden inputs** | On the phone, the laptop's admin console HTML is hidden but still in the DOM. Typography functions use an `isRemote` guard to always read from the correct device's inputs first |

---

## Platform & Hosting

| Component | Provider | Notes |
|---|---|---|
| Website hosting | **Netlify** | Free tier; auto-deploys when code changes |
| API calls (proxy) | **Netlify Functions** | Serverless — no always-on server needed |
| Transcript sync | **Upstash Redis** | Serverless key-value store; ~$0 at this usage level |
| Speech-to-text | **Groq API** | Pay-per-second of audio |
| Translation + summary | **Anthropic API** | Pay-per-token (words processed) |

> **Cost per Sunday:** At typical sermon lengths (45–60 min), estimated API cost is **$0.20–$0.50 per service**, dominated by Claude Sonnet translation calls. Costs are lower than earlier versions thanks to the reduced context window (3 segments instead of 8) and incremental summaries.

---

## What the Operator Sees

**Laptop (main display)**
```
┌──────────────────────────────────────────────────────────┐
│  The Book of Philippians                                  │  ← sermon title (if set)
│                                                          │
│   In the ancient city of Philippi, Rome had             │
│   established a colony where retired soldiers            │
│   were given homes and a place to call their own.       │
│                                                          │
│   The Apostle Paul wrote to this church not from         │
│   a palace, but from a prison cell.                      │
│                                                          │
│                                              ⚙  [gear]  │
└──────────────────────────────────────────────────────────┘
                                    ▲ clicking ⚙ opens admin panel
```

**Admin console (laptop) — slides up from the bottom:**
```
┌──────────────────────────────────────────────────────────────┐
│ Admin Console                          [↗ Pop out]  [Close] │
├──────────────────────────────────────────────────────────────┤
│ ▶ Begin  ■ Stop  Mute  Clear  ↓ Download                    │
│ Title: [Sermon title input_________]                         │
│ Segment: [30s ▾]                                             │
│ Size    ──●── [46]   Spacing ──●── [20]                     │
│ Scroll  ──●── [100]  ↓ Follow                                │
├──────────────────────────────────────────────────────────────┤
│ [13:42:01] Groq transcribing...                              │
│ [13:42:04] KO: 하나님은 우리를 사랑하시고…                  │
│ [13:42:07] EN: God loves us and has a plan for our lives…   │
└──────────────────────────────────────────────────────────────┘
```

**Phone (remote view)** — normally just the transcript; tap ⚙ to reveal controls:
```
┌─────────────────────────────────┐
│ ⚙  [gear — tap to show controls]│  ← always visible
├─────────────────────────────────┤  ← panel slides down on tap
│ ● Live  ▶ Begin  ■ Stop  Mute  │
│ Clear  ↓ Download  ↓ Follow     │
│ Title: [___________________]    │
│ Segment: [30s ▾]                │
│ Size ──●── [46]  Spacing──●──[20]│
│ Scroll ──●── [100]              │
├─────────────────────────────────┤
│                                 │
│  The Book of Philippians        │
│                                 │
│   In the ancient city of        │
│   Philippi, Rome had            │
│   established a colony…         │
│                                 │
└─────────────────────────────────┘
```

**Detachable console:** Clicking **↗** in the admin console opens a floating popup window with the full log and controls — useful when the laptop is connected to a projector and the console panel would cover the transcript.

---

## Mute

Pressing **Mute** keeps the session running (the microphone stays open, the session indicator stays Live) but silently discards every audio chunk without sending it to Groq or Claude. Nothing is added to the transcript. Press **Unmute** to resume. The mute state is visible on both the laptop and all connected phones.

---

## Editable Transcript

Every sentence on screen is directly editable — click any line to place a cursor, type your correction, then click away. The correction syncs to all other connected devices within 1–3 seconds. Edited text is preserved when you download the transcript.

---

## Token & Cost Optimizations

Several design choices keep API costs low without sacrificing translation quality:

| Optimization | Effect |
|---|---|
| **Context window: 3 segments** | Claude sees only the last 3 translated segments (not 8). This cuts ~60% of input tokens per translation call with negligible quality loss — the rolling summary fills in long-term context. |
| **Incremental summaries** | Haiku receives previous summary + latest 8 segments, not the entire sermon. Keeps summary input at ~constant size. Over a 60-min sermon, this is ~5–9× fewer Haiku tokens. |
| **Max output tokens: 400** | A 20-second chunk rarely produces more than ~150 English tokens. Capping at 400 (instead of 1000) is safe with plenty of headroom. |
| **Cached MIME detection** | `MediaRecorder.isTypeSupported()` is called once and cached, not every chunk. |
| **Single-endpoint polling** | Laptop polls one URL for commands + edits + typography (was two separate fetches). Halves HTTP requests from 40/min to 20/min. |
| **No Whisper fallback prompt** | First segment sends empty prompt to Whisper. Sending keyword lists caused hallucinations on silence that cost extra Claude calls to process. |
