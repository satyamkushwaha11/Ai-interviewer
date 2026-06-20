# AI Interviewer MVP

A SaaS application for conducting AI-powered interviews. Users can paste their resume and job description to generate tailored interview questions, answer them textually, and receive a performance report.

## Features

- Resume and Job Description Input
- AI-Generated Interview Questions
- Text-Based Interview Simulation
- Automated Report Generation

## Getting Started

1. Clone the repository.
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.local` and add your OpenAI or Gemini API key.
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The app supports either OpenAI or Google Gemini for its text features. Set at
least one provider's API key.

- `AI_PROVIDER` (optional): force a provider — `"openai"` or `"gemini"`. If
  unset, the app auto-selects OpenAI when `OPENAI_API_KEY` is present, otherwise
  Gemini when `GEMINI_API_KEY` is present.
- `OPENAI_API_KEY`: OpenAI API key. Also required for text-to-speech.
- `OPENAI_CHAT_MODEL` (optional): defaults to `gpt-4o-mini`.
- `GEMINI_API_KEY`: Google Gemini API key.
- `GEMINI_CHAT_MODEL` (optional): defaults to `gemini-2.0-flash`.

If no key is set, the routes return stubbed responses so the app still runs.

## Tech Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- OpenAI API / Google Gemini API

## Deployment

Deploy on Vercel or any Node.js hosting platform.
