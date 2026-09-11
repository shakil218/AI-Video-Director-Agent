# 🎬 AI Video Director Agent
### Autonomous Video Editing & Transcript Optimization Pipeline

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://ai-video-director-agent.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-14%2B-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![n8n](https://img.shields.io/badge/n8n-Workflow%20Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Multimodal%20AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🌟 Overview

**AI Video Director Agent** is an autonomous AI-powered assistant and video directing workspace that bridges the gap between raw video footage and a production-ready cut. By coupling the conversational and analytical intelligence of **Google Gemini** with the event-driven workflow orchestration of **n8n**, this platform automates speech transcription analysis, identifies dead air and filler segments, and generates a structured, actionable edit decision list (EDL) with targeted visual recommendations.

Whether you are creating short-form social reels, YouTube tutorials, or corporate interviews, the AI Video Director Agent reviews your footage like a seasoned post-production supervisor.

🔗 **Live Deployment:** [ai-video-director-agent.vercel.app](https://ai-video-director-agent.vercel.app/)  
📁 **Repository:** [github.com/shakil218/AI-Video-Director-Agent](https://github.com/shakil218/AI-Video-Director-Agent)

---

## ✨ Key Features

- **📂 Seamless Local Media Ingestion**
  - Instant drag-and-drop upload for local `.mp4` files.
  - Client-side video player preview with real-time metadata display and timeline scrubbing.
- **⚡ n8n Webhook & Orchestration Engine**
  - Integrated status monitor checking n8n webhook connectivity.
  - Asynchronous background pipeline coordination connecting AI models, storage, and webhooks.
- **🧠 Conversational Gemini Video Director Chat**
  - Interactive dialogue with an AI Director agent tailored for post-production.
  - Dynamic **Quick Revisions** chips to rapidly iterate on pacing, tone, and audience retention strategies.
- **✂️ Structured Edit Plan Review**
  - Precise cut list timestamp generation (trims, silence cuts, punch-ins).
  - Context-aware recommendations for text popups, lower-thirds, and callout graphics.
  - B-roll cues and visual pacing indicators synced with the transcript.
- **🎨 Sleek, Production-Ready Interface**
  - Built with a high-contrast dark theme optimized for video editors and creators.
  - Responsive multi-panel layout: Source Ingestion, Director Chat, and Edit Plan Inspector.

---

## 🏗️ Architecture & Pipeline Flow

```
+------------------+         +-------------------------+
|   User Browser   |         |   Next.js 14 Frontend   |
| (Drop .mp4 File) | ------> |  - Video Ingestion      |
+------------------+         |  - Director Chat UI     |
                             |  - Edit Plan Review     |
                             +------------+------------+
                                          |
                                (Webhook Trigger)
                                          v
                             +-------------------------+
                             |      n8n Orchestrator   |
                             |  - Workflow Automation  |
                             |  - Data Transformation  |
                             +------------+------------+
                                          |
                                (Multimodal Prompting)
                                          v
                             +-------------------------+
                             |    Google Gemini AI     |
                             |  - Transcript Reasoning |
                             |  - Cut List & Pacing    |
                             |  - B-Roll / Visual Cues |
                             +------------+------------+
                                          |
                               (Structured JSON Plan)
                                          v
                             +-------------------------+
                             | Interactive Output View |
                             |  - Timestamped Edits    |
                             |  - Revision Iterations  |
                             +-------------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [Next.js](https://nextjs.org/) (App Router, React 18/19) |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/), Modern Dark Glassmorphism |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Workflow Automation** | [n8n](https://n8n.io/) Webhooks & Workflow Engine |
| **AI & LLM Reasoning** | [Google Gemini API](https://ai.google.dev/) (Multimodal & NLP) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 Getting Started

Follow these steps to run the project locally on your machine.

### Prerequisites

- **Node.js**: v18.17 or higher
- **npm**, **yarn**, or **pnpm**
- An active **n8n** instance (Cloud or self-hosted)
- A **Google Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/shakil218/AI-Video-Director-Agent.git
cd AI-Video-Director-Agent
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and configure your keys:

```env
# n8n Webhook Configuration
NEXT_PUBLIC_N8N_WEBHOOK_URL="https://your-n8n-instance.com/webhook/video-director"

# Gemini API Configuration (if direct client/server API route is utilized)
GEMINI_API_KEY="your-gemini-api-key-here"

# Application Settings
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## 📋 Recommended n8n Workflow Configuration

The agent is designed to communicate with an n8n webhook workflow. A typical workflow layout includes:

1. **Webhook Node (`POST`)**: Receives video metadata, transcription payload, or media references from the frontend.
2. **Google Gemini / AI Agent Node**:
   - System Prompt: Acts as an expert Video Director and Editor.
   - Outputs structured JSON conforming to the Edit Plan schema:
     ```json
     {
       "summary": "High-energy hook followed by tutorial breakdown",
       "cuts": [
         { "start": "00:00:04", "end": "00:00:07", "reason": "Silence & filler breath" },
         { "start": "00:01:12", "end": "00:01:15", "reason": "Repetitive phrase" }
       ],
       "overlays": [
         { "timestamp": "00:00:02", "text": "Build Faster with AI", "type": "lower-third" }
       ],
       "bRollSuggestions": [
         { "timestamp": "00:00:35", "cue": "Cutaway to terminal command execution" }
       ]
     }
     ```
3. **Respond to Webhook Node**: Returns the parsed edit plan to the web application.

---

## 🗺️ Roadmap & Future Enhancements

- [ ] **Direct Timeline Export**: Export directly to **DaVinci Resolve (.edl / .xml)** and **Adobe Premiere Pro (.prproj / FCPXML)**.
- [ ] **Client-side FFmpeg WebAssembly**: Automated trimming and export of finalized clips directly within the browser.
- [ ] **Multi-Speaker Diarization**: Distinct cut schedules based on speaker turns in interviews and podcasts.
- [ ] **Automated Caption Styling**: Kinetic subtitle generation with customizable font and animation presets.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This repository is an educational and practice project created for learning and portfolio demonstration purposes. It is licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Md Shakil Islam**  
- GitHub: [@shakil218](https://github.com/shakil218)  
- Live Application: [AI Video Director Agent](https://ai-video-director-agent.vercel.app/)
