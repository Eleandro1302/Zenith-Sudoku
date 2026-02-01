# Zenith Sudoku

A premium, modern Sudoku experience built with React, TypeScript, and AI.

Zenith Sudoku redefines the classic puzzle game with a polished mobile-first interface, **handwriting recognition**, and an **AI Grandmaster** hint system powered by Google Gemini.

## ✨ Key Features

- **✍️ Handwriting Recognition:** Draw numbers directly into cells using your mouse or finger. The custom recognition algorithm detects strokes in real-time.
- **🧠 AI-Powered Hints:** Stuck? Ask the AI Grandmaster (Google Gemini) for a logical hint without revealing the full solution.
- **🧮 Abacus Mode:** Switch between standard Arabic numerals and a visual Soroban (Japanese Abacus) display for a unique cognitive challenge.
- **📱 Responsive Design:** A highly polished UI that works perfectly on desktop and mobile devices, supporting dark mode.
- **📝 Smart Notes:** Toggle note-taking mode to track candidates within cells.
- **⚡ Modern Tech Stack:** Built with React 19, Tailwind CSS for styling, and Lucide React for iconography.

## 🚀 Getting Started

### Prerequisites

- Node.js installed.
- A Google Gemini API Key (for AI hints).

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/zenith-sudoku.git
   cd zenith-sudoku
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   Create a `.env` file in the root directory and add your Google Gemini API key:
   ```env
   API_KEY=your_google_api_key_here
   ```

4. **Run the application**
   ```bash
   npm start
   ```

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite (assumed based on structure)
- **Styling:** Tailwind CSS
- **AI Integration:** Google GenAI SDK (`@google/genai`)
- **Icons:** Lucide React
- **Algorithms:** Custom geometric stroke recognition, Backtracking Sudoku generator

## 👤 Author

Developed by **Eleandro**.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/eleandro-mangrich?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app)

---

*Experience the art of logic.*
