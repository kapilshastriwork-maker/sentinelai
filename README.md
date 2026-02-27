# 🛡️ SentinelAI — Real-Time AI Surveillance System

> **Zero-shot threat detection with live voice alerts. No training required.**

Built for the [Stream Vision Agents Hackathon](https://visionagents.ai) using Vision Agents SDK, Moondream, Gemini Realtime, and Stream WebRTC.

---

## 🎬 Demo

> Camera feed + SentinelAI agent side-by-side. Green bounding boxes appear on detected threats. Voice alerts fire automatically.

**Detections in action:**
- `unattended bag 1.00` — 100% confidence with bounding box overlay
- Automatic voice alert: *"ALERT! Unattended bag detected!"*
- Two-way Gemini voice conversation: *"What are you watching for?"*

- ## 🎬 Demo Video

[![SentinelAI Demo](https://img.youtube.com/vi/RX4EW9DvaFQ/maxresdefault.jpg)](https://www.youtube.com/watch?v=RX4EW9DvaFQ)

> Click the thumbnail to watch the live demo on YouTube

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎯 Zero-shot detection | Detect ANY threat using plain English — no model training needed |
| 🔊 Voice alerts | Gemini Realtime announces threats automatically the moment they appear |
| 🎤 Two-way voice | Talk to SentinelAI — ask questions, get status updates |
| 📦 Bounding boxes | Live overlay on the SentinelAI video tile showing exact threat location |
| ⚡ Sub-30ms latency | Stream's edge WebRTC network for ultra-low latency video |
| 🔄 Auto-reconnect | Automatically recovers from session timeouts without interruption |
| 🎨 Custom dashboard | Dark surveillance UI with live feed, watchlist, and alert log |

---

## 🏗️ Architecture

```
Browser (React)
    │
    ▼
FastAPI Backend (port 8000)
    │  Creates Stream call
    │  Returns token + credentials
    │
    ├──► Vision Agent Server (port 8001)
    │       │
    │       ├── Moondream CloudDetectionProcessor (2 FPS)
    │       │       └── Zero-shot object detection
    │       │       └── Annotates frames with bounding boxes
    │       │
    │       └── Gemini Realtime LLM
    │               └── Watches video at 2 FPS
    │               └── Auto-announces threats via voice
    │               └── Two-way voice conversation
    │
    └──► Stream WebRTC (SFU)
            └── Browser joins same call
            └── Sees both: raw feed + annotated SentinelAI feed
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) package manager

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/sentinelai
cd sentinelai
uv sync
cd frontend && npm install && npm run build && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
MOONDREAM_API_KEY=your_moondream_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Get free API keys:
- **Stream**: [getstream.io](https://getstream.io) — 333,000 participant minutes/month free
- **Moondream**: [moondream.ai](https://moondream.ai) — free tier available
- **Gemini**: [aistudio.google.com](https://aistudio.google.com) — free tier available

### 3. Run (3 terminals)

**Terminal 1 — FastAPI Backend:**
```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Vision Agent Server:**
```bash
uv run main.py serve --port 8001
```

**Terminal 3 — React Frontend:**
```bash
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and click **▶ START MONITORING**.

---

## 🎯 Threat Watchlist

SentinelAI monitors for these threats out of the box:

- 🔪 Knife
- 🔫 Gun  
- 🔥 Fire
- 🧍 Person fallen on ground
- 🎒 Unattended bag

**Add any threat using plain English** in the dashboard — Moondream uses zero-shot detection so no retraining is needed.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Vision AI | [Moondream Cloud](https://moondream.ai) — zero-shot object detection |
| Voice AI | [Gemini 2.0 Realtime](https://deepmind.google/gemini) — live voice + video understanding |
| Video Infrastructure | [Stream WebRTC](https://getstream.io/video) — ultra-low latency SFU |
| Agent Framework | [Vision Agents SDK](https://github.com/GetStream/Vision-Agents) v0.3 |
| Backend | FastAPI + Python 3.12 |
| Frontend | React + Vite + Stream Video React SDK |
| Package Manager | uv |

---

## 📁 Project Structure

```
VISION AI/
├── main.py              # FastAPI backend + Vision Agent server
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main dashboard component
│   │   └── main.jsx
│   └── dist/            # Built React app (served by FastAPI)
├── .env                 # API keys (never commit this!)
├── .env.example         # Template
└── pyproject.toml       # Dependencies
```

---

## 🔑 How It Works

1. **Browser** clicks START MONITORING → `POST /api/join`
2. **FastAPI** creates a Stream call, tells the Vision Agent server via `POST /sessions`
3. **Vision Agent** joins the same call with:
   - **Moondream processor** receiving your video at 2 FPS, drawing bounding boxes on detections
   - **Gemini Realtime** watching the annotated video, ready to speak
4. **Browser** joins the same call — sees your raw feed AND the SentinelAI annotated feed
5. When Moondream detects a threat with ≥35% confidence, it queues an alert
6. The alert is sent to **Gemini**, which speaks it aloud: *"ALERT! Knife detected!"*
7. A 15-second cooldown prevents repeated alerts for the same threat

---

## 🏆 Hackathon Submission

**Project:** SentinelAI  
**Category:** Security / Safety AI  
**Hackathon:** Stream Vision Agents Hackathon 2025  

**What makes this special:**
- Zero-shot detection means no labelled dataset or model training — just describe the threat in English
- The combination of Moondream (vision) + Gemini Realtime (voice) creates a truly multimodal security agent
- Production-ready architecture with auto-reconnect and Windows compatibility fixes

---

## 📄 License

MIT License — see [LICENSE](LICENSE)

---

Built with ❤️ using [Vision Agents](https://github.com/GetStream/Vision-Agents) by Stream
