# ZenithGPT

A chat app I built with React and FastAPI. Streaming responses, file uploads, voice input, dark mode, and a few different AI personas.

Live demo: https://zenithgpt.vercel.app

You can sign up with any email, takes about 10 seconds.

## Tech

- Frontend: React (Create React App), plain CSS
- Backend: FastAPI, Python 3.11
- DB and auth: Supabase (Postgres + JWT)
- LLM: Groq API (Llama models)
- Hosting: Vercel for the frontend, Render for the backend

## What it does

- Chat with token-by-token streaming
- Upload images, PDFs, Word docs, PowerPoint files (parsed server-side)
- Voice input using the browser's speech recognition
- Light and dark themes
- A few AI modes: general chat, coding helper, writing assistant
- Per-user conversation history
- Profile photo upload
- Forgot password flow
- Export your data and delete your account

## Run locally

You'll need a Supabase project and a Groq API key.

Backend:

```
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload
```

Frontend:

```
cd frontend
npm install
npm start
```

The frontend expects the backend at `http://localhost:8000` by default. Change it in `frontend/src/App.js` if you run the backend elsewhere.

## Things I had to figure out

A few problems that took a while:

**Supabase JWT verification.** Their docs default to one signing algorithm but the tokens my project actually issued used a different one, so verification kept silently failing. Took an embarrassing amount of time to spot.

**Streaming responses through Render.** Worked locally, broke in prod. Turned out the proxy was buffering. Had to set the right media type on `StreamingResponse` and add a header to disable buffering.

**PowerPoint parsing.** `.pptx` files are zip archives with XML inside. `python-pptx` handled most of it, but I had to fall back to direct zip extraction for a few edge cases.

**Mobile keyboard covering the chat input.** Classic. CSS `dvh` units fixed it.

## Notes

API keys aren't in this repo. The backend reads them from environment variables. If you fork this and want to run it, you'll need your own Supabase project and Groq API key.

## License

MIT. See [LICENSE](LICENSE).
