# Smart Home Voice Automation 🎙️⚡

> **Voice-Controlled IoT Home Automation Capstone Project**  
> A production-ready, mobile-first Web Application for controlling a 2-channel smart home automation system powered by **ESP8266 NodeMCU**, **Arduino IoT Cloud**, **Supabase PostgreSQL**, and browser-native **Web Speech APIs**.

---

## 📸 Overview & Key Features

- **🎙️ Hands-Free Voice Control**: Speak natural language commands to control appliances using browser Web Speech Recognition.
- **🔊 Spoken Audio Feedback**: Receives spoken confirmation responses using Web SpeechSynthesis.
- **📱 Mobile-First Responsive Design**: Optimized for Android smartphones, tablets, and desktop displays with smooth glassmorphism UI.
- **💡 2-Channel Relay Output**: Controls **Bulb 1** (`Switch1`) and **Bulb 2** (`Switch2`) with live active glows and master *Turn All On / Turn All Off* switches.
- **🔐 Secure Architecture**: Frontend uses strictly public Supabase publishable keys. Secrets are isolated on the Cloudflare Worker backend.
- **⚡ Local Demo Mode**: Works 100% locally out-of-the-box in Demo Mode without requiring an active physical hardware connection or deployed backend.
- **📜 Audit Command Logging**: Persists all voice and manual toggle actions in Supabase `commands` database table.
- **📊 System Telemetry**: Monitors real-time status of Internet, Supabase DB, Web Speech Engine, Backend Worker API, ESP8266, and Arduino IoT Cloud.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Routing** | React Router v7 |
| **Styling** | Tailwind CSS v4 + Framer Motion |
| **Icons** | Lucide React |
| **Database & Auth** | Supabase Authentication & PostgreSQL RLS |
| **Voice Processing** | Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) |
| **Hardware Node** | ESP8266 NodeMCU + 2-Channel 5V Relay |
| **Cloud IoT API** | Arduino IoT Cloud (Variables: `Switch1`, `Switch2`) |
| **Backend Integration** | Cloudflare Worker API Abstraction |

---

## 🏗️ System Architecture

```text
       Mobile Android Browser / Desktop Browser
                         │
                         ▼
             React 19 + Vite Frontend
                         │
                         ▼
     Cloudflare Worker API (POST /api/device/control)
                         │
                         ▼
               Arduino IoT Cloud REST API
                         │
                         ▼
                 ESP8266 NodeMCU
                         │
                         ▼
                  2-Channel Relay
                    /        \
              Bulb 1          Bulb 2
            (Switch1)       (Switch2)

Supabase PostgreSQL Database:
  ├── profiles        (User Profile)
  ├── devices         (Registered Hardware)
  ├── device_states   (Bulb 1 & Bulb 2 States)
  └── commands        (Audit Log History)
```

---

## 🗣️ Supported Voice Commands

The application includes a structured command parser ([`src/utils/commandParser.ts`](file:///f:/ES%20&%20IOT/smart-home-automation/src/utils/commandParser.ts)) supporting natural variations:

| Target | Command Examples | Structured Payload |
| :--- | :--- | :--- |
| **Bulb 1** | `"Turn on bulb one"`, `"Switch on bulb one"`, `"Turn bulb one on"` | `{ device: "bulb1", action: "on" }` |
| **Bulb 1** | `"Turn off bulb one"`, `"Switch off bulb one"`, `"Turn bulb one off"` | `{ device: "bulb1", action: "off" }` |
| **Bulb 2** | `"Turn on bulb two"`, `"Switch on bulb two"`, `"Turn bulb two on"` | `{ device: "bulb2", action: "on" }` |
| **Bulb 2** | `"Turn off bulb two"`, `"Switch off bulb two"`, `"Turn bulb two off"` | `{ device: "bulb2", action: "off" }` |
| **Both Bulbs** | `"Turn on both bulbs"`, `"Turn off both bulbs"`, `"Switch on both bulbs"` | `{ device: "all", action: "on" / "off" }` |
| **System Status** | `"What is the status?"`, `"What is the status of the bulbs?"` | `{ device: "system", action: "status" }` |

*Unrecognized commands prompt spoken feedback: `"Sorry, I didn't understand that command."` and are not executed.*

---

## 🚀 Local Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/smart-home-automation.git
cd smart-home-automation
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your Supabase publishable credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
VITE_API_BASE_URL=
```
*(Leave `VITE_API_BASE_URL` empty to run in local Demo Mode)*

---

## 💻 Running the Application

### Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173/` in your browser.

### Build Production Bundle
```bash
npm run build
```
Build output is saved to `dist/`.

---

## 🔗 Connecting Arduino IoT Cloud & Cloudflare Worker (Future Deployment)

When you are ready to connect physical hardware:

1. Deploy a Cloudflare Worker implementing `POST /api/device/control`.
2. Securely store your Arduino IoT Cloud API Client ID & Client Secret in Worker secret variables.
3. Update `VITE_API_BASE_URL` in your `.env` or from the **Settings** page in the application.
4. The frontend will automatically switch from **Demo Mode** to **Hardware Live** mode without requiring code changes.

---

## 🛡️ Security Note

- **Never** commit `.env` containing sensitive credentials to GitHub.
- Supabase Row Level Security (RLS) is enabled on all tables.
- Secrets are restricted to backend execution environments.

---

## 📝 License

This project is open-source and created for educational & capstone demonstration purposes.
