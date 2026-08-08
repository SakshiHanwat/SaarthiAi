# Saarthi — Adaptive AI Technical Interviewer

**Saarthi** (meaning *guide* or *charioteer*) is an AI-powered technical interview platform designed to conduct realistic, situational mock interviews. Powered by **Google Gemini** and backed by **Breeth Graph Memory**, Saarthi dynamically adapts its line of questioning based on a candidate's course history, past interview signals, and real-time response quality.

---

## 🚀 Key Features & Differentiators

### 1. 🧠 Breeth Graph-Powered Cross-Session Memory
Unlike typical stateless chatbot interviews, Saarthi remembers candidates across multiple sessions using [Breeth](https://thebreeth.com):
- **Candidate Profiles**: Ingests candidate background, completed missions, skipped topics, and prior attempt counts into Breeth episodic memory graph (`POST /v1/episodes`).
- **Live Interview Signals**: Asynchronously logs 1-sentence observations after every answer with intent extraction enabled (`extract_intent: true`), capturing strengths, weaknesses, and cognitive patterns.
- **Cross-Session Resumption**: Before opening an interview, Saarthi queries Breeth (`POST /v1/search`) for prior session facts, seamlessly weaving past weak areas into opening questions ("📋 *Building on your last session...*").

### 2. 🗺️ Live 8-Module Curriculum Coverage Map
- Displays a real-time visual coverage grid tracking candidate progress across the **31-Day AI Cohort Curriculum** (Modules 1 through 8: *Environment & Tooling*, *Data Foundations*, *Embeddings & Vector Search*, *LLM Core*, *Chatbot Build*, *Agentic AI & MCP*, *Evaluation & Security*, *Production & Capstone*).
- Highlighted live as questions touch on topics within each module.
- Generates a final coverage snapshot on the post-interview evaluation screen.

### 3. 🏷️ Live Interviewer Signal Badges
- Provides immediate, subtle feedback pills (e.g. `📋 Read: "Strong fundamentals"`, `📋 Read: "Needs depth"`) attached to candidate answers.
- Styled as an interviewer's private observation notes—understated and professional without intrusive gamification.

### 4. 📊 Structured Post-Interview Assessment
- Automatically generates comprehensive evaluation feedback once the interview criteria are met (8+ questions across 4+ unique curriculum days).
- Provides actionable breakdown: **Overall Assessment**, **Demonstrated Strengths**, **Areas to Strengthen**, and **Recommended Next Steps**.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Actions & API Routes)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **AI Engine**: [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) (`gemini-flash-latest`)
- **Memory Layer**: [Breeth REST API](https://docs.thebreeth.com/) (Graph Memory & Episodic Retrieval)
- **Styling**: Modern dark-mode aesthetics using Vanilla CSS custom properties (`#0a0a0a` charcoal theme) and Tailwind CSS utilities

---

## 📁 Project Structure

```
saarthi/
├── app/
│   ├── api/
│   │   └── interview/
│   │       └── route.ts          # Main single-POST endpoint (start & answer actions)
│   ├── interview/
│   │   └── page.tsx              # Live interview chat UI, coverage map, & feedback panel
│   ├── globals.css               # Design system tokens & dark theme CSS variables
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing screen & candidate profile selector
├── data/
│   ├── candidates.json           # 20 candidate profiles with mission performance data
│   └── curriculum.json           # 31-day AI cohort curriculum & 8 module mappings
├── lib/
│   ├── breeth.ts                 # Breeth REST API client (addEpisode, search, writeSignal, etc.)
│   └── gemini.ts                 # Gemini API wrapper (nextTurn, finalFeedback, extractJSON)
├── .env.local.example            # Environment variables template
├── package.json
└── tsconfig.json
```

---

## ⚙️ How Breeth Memory Works

```
                     +-----------------------+
                     |    Candidate Selection|
                     +-----------+-----------+
                                 |
                                 v
                     +-----------------------+
                     |   POST /api/interview |
                     |    action: "start"    |
                     +-----------+-----------+
                                 |
        +------------------------+------------------------+
        |                                                 |
        v (Async)                                         v (Await)
+---------------+                                 +---------------+
| Breeth API    |                                 | Breeth API    |
| POST /episodes|                                 | POST /search  |
| (Write Profile|                                 | (Fetch Prior  |
|  Summary)     |                                 |  Signals)     |
+---------------+                                 +-------+-------+
                                                          |
                                                          v
                                                  +---------------+
                                                  | Gemini 1.5    |
                                                  | Generate      |
                                                  | Contextual Q  |
                                                  +---------------+
```

1. **`writeCandidateProfile`**: Converts structured candidate metadata into natural-language prose and writes it to Breeth as an episode under `group_id: candidateId`.
2. **`writeInterviewSignal`**: Logs concise observations after each answer turn with `extract_intent: true`. Breeth automatically extracts entities, edges, and cognitive pattern metadata.
3. **`getCandidateSignals`**: Performs hybrid vector/BM25 graph search across past sessions for candidate `group_id`, allowing Gemini to recall historical performance.

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ installed
- A Google Gemini API Key ([Get Key](https://aistudio.google.com/))
- A Breeth API Key ([Breeth Dashboard](https://www.thebreeth.com/app))

### 2. Environment Configuration
Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
BREETH_API_KEY=your_breeth_api_key_here
BREETH_BASE_URL=https://api.thebreeth.com/v1
```

### 3. Installation & Running
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start using Saarthi.

---

## 🧪 Verification & Type Safety

Run TypeScript validation:
```bash
npx tsc --noEmit
```

---

## 📄 License

MIT License. Built for the Craftora Creator League Hackathon.
