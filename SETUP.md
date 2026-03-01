# Setup Guide

Step-by-step instructions for using the Korean-to-English Sermon Translator.

---

## Before the Service

### 1. Open the app

Open the website URL in Chrome (or any modern browser) on the laptop that will be connected to the display/projector. Full-screen the browser (F11 or Cmd+Shift+F).

### 2. Open the Admin Console

Click the **gear icon** in the bottom-right corner of the screen. The admin panel slides up from the bottom.

### 3. Set the sermon title

Type the sermon title in the **Title** field. This appears at the top of the display for the congregation.

### 4. Adjust display settings

- **Size** — font size of the translated text (slider + number input)
- **Line** — spacing between wrapped lines within a sentence
- **Segment** — gap between translation segments
- **Scroll** — auto-scroll speed (teleprompter-style); higher = faster

These settings sync to all connected devices (phone, other browsers).

### 5. Pop out the console (recommended)

Click the **pop-out arrow** button in the admin console header. This opens the controls in a separate window — move it to a second monitor or keep it on the side. The main browser window is now clean for the projector.

---

## During the Service

### Starting

1. Click **Begin** in the admin console (or the popped-out console, or the phone remote)
2. Allow microphone access when the browser asks
3. The system starts recording and translating automatically

### Controls while running

| Button | What it does |
|---|---|
| **Stop** | Ends the session. Tears down the mic, wipes all context and the cloud sync store. |
| **Mute** | Keeps the session running but silently discards audio. Useful during worship music or announcements you don't want translated. Press again to unmute. |
| **Clear** | Makes the screen go black by pushing text off-screen. Does NOT wipe sermon context — translation quality stays consistent because Claude still has the previous segments and summary. Use this mid-sermon to declutter the display. |
| **Download** | Saves the full transcript as a `.txt` file at any time. |
| **Follow** | Appears when you scroll up manually. Click to snap back to the bottom and resume auto-scroll. |

### VAD (Voice Activity Detection)

The **VAD** checkbox is off by default. When enabled:
- The system monitors the microphone for silence
- When the pastor pauses for 0.5+ seconds (and the chunk is at least 3s old), the recording cuts early and sends immediately
- This reduces latency from ~30s to ~8-15s

**When to use VAD:**
- Q&A sessions, short announcements, prayer requests
- Any situation where speed matters more than translation polish

**When to keep VAD off (recommended for sermons):**
- Regular Sunday sermons
- Longer chunks give Claude more speech context, producing more natural translations

### Max chunk duration

The **Max** dropdown (20s / 25s / 30s) sets the maximum recording time before a chunk is sent. Default is 25s. With VAD off, every chunk runs to this full duration. With VAD on, this acts as a ceiling — chunks may cut earlier on pauses.

---

## Phone Remote Control

### Connecting

Open the same website URL on your phone but add `?remote` to the end:
```
https://your-site.netlify.app/?remote
```

The phone shows the same transcript and has full admin controls behind the gear icon.

### What you can do from the phone

- Start / Stop / Mute the session
- Set the sermon title
- Change chunk duration and VAD
- Adjust all typography settings (syncs to the laptop display)
- Edit any sentence (tap to edit, tap away to save)
- Download the transcript
- View API metrics (Claude, Groq, Upstash usage)

The phone polls the cloud every 1.5 seconds, so changes appear within ~2 seconds.

---

## Editing the Transcript

Click (or tap) any sentence on screen to edit it in place. The text becomes editable — type your correction, then click/tap away to save. The edit syncs to all connected devices within 1-3 seconds and is preserved in downloaded transcripts.

Auto-scroll pauses while you're editing. Click **Follow** to resume.

---

## After the Service

1. Click **Stop** — the session ends and all context is wiped
2. The transcript auto-downloads as a `.txt` file
3. You can also click **Download** at any time during or after the service

---

## Tips

- **Pop out the console** to a second monitor so the projector shows only the sermon text
- **Keep VAD off** for the main sermon — translation quality is noticeably better with full 25s chunks
- **Use Mute** during worship music instead of stopping the session — it keeps the mic open so you can unmute instantly
- **Use Clear** to declutter the screen mid-sermon without losing context — the next translation will still flow naturally from the previous one
- **Set the scroll speed** before the service starts — too fast and the congregation can't read; too slow and text piles up at the bottom
- **Font size 70-90** works well for most projector setups; adjust during rehearsal
