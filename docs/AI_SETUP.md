# MineGuard worker AI features

The worker AI photo checker and assistant use Google Gemini when `GOOGLE_API_KEY` is configured, or OpenAI when only `OPENAI_API_KEY` is configured. Keys stay on the Node backend; the browser never receives them.

Add these values to the backend environment (`.env`) and restart `node server.js`:

```dotenv
GOOGLE_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-3.8-flash
```

Alternatively, configure `OPENAI_API_KEY` and `MINEGUARD_AI_MODEL=gpt-4.1-mini`. Restart `node server.js` after changing environment values. The assistant and image checker send at most the most recent eight short chat messages or one JPEG/PNG/WebP image (up to 4 MB), respectively. Do not photograph faces, personal documents, or other unnecessary identifying information.

If no key is configured, AI requests return HTTP 503 with setup guidance. No mock analysis is shown. The AI is general safety guidance only and must not replace mine emergency procedures, a supervisor, a qualified inspector, or medical care.
