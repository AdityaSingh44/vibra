# Taru — Messaging microservice (scaffold)

This folder contains a minimal, runnable scaffold of the Taru messaging microservice. It's designed for local development and smoke testing without external databases.

What is included
- Express HTTP server with simple conversation and message endpoints.
- Socket.IO handlers for real-time messaging (subscribe, send_message, message_status).
- In-memory data models for Conversation and Message (easy to replace with MongoDB later).
- Dockerfile (minimal) and a smoke test script.

Quick start (Windows PowerShell)

1. From `taru` folder, install dependencies:

   npm install

2. Run smoke test (quick local run that sends a message and prints results):

   npm run smoke

3. Start server:

   npm start

Notes
- This scaffold uses an in-memory store for simplicity. Replace `src/models/store.js` with a MongoDB adapter when you move to production.
- The `src/smoke.js` script demonstrates sending a message via HTTP and receiving the persisted result.
