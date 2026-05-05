# ZenithGPT

Full-stack AI chat app. Streaming responses, file uploads (PDF, Word, PowerPoint, images), voice input, dark mode.

Live demo: https://zenithgpt.vercel.app

## Stack

React, FastAPI (Python), Supabase (Postgres + auth), Groq API for the LLM (Llama 3.3). Frontend on Vercel, backend on Render.

## Features

- Streaming chat
- File uploads parsed on the backend
- Voice input via the browser
- Light and dark theme
- Multiple chat modes (general, coding, writing, data, health)
- Per-user conversation history
- Profile photo upload
- Password reset, data export, account deletion

## Running locally

You need a Supabase project and a Groq API key. Both have free tiers.

Backend:

```
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Frontend:

```
cd frontend
npm install
npm start
```

Frontend hits `http://localhost:8000` for the backend. Change it in `frontend/src/App.js` if you're running the backend on a different port.

## A few things that took me a while

Supabase JWT signing algorithm caught me off guard. The docs use one default but my project's tokens were signed with a different one, so verification kept failing without throwing anything useful.

Streaming worked locally but the Render proxy buffered everything in production. Had to set the media type and disable buffering with a response header.

`.pptx` files are zip archives. `python-pptx` handles most parsing but I fell back to direct zip extraction for a few edge cases.

Mobile keyboards covering the chat input. `dvh` units fixed it.

## License

MIT
