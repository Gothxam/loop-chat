# Loop | Real-Time Workplace Messaging

A full-stack, real-time workplace chat application designed with a dark glassmorphic interface, instant presence syncing, file sharing, message actions (replies, edits, reactions, deletions), read receipts, and native desktop notifications.

## Project Structure

```
chat/
├── client/          # Next.js (App Router, Tailwind CSS, Zustand, TanStack Query)
├── server/          # Node.js, Express, Socket.IO, Mongoose/MongoDB, Multer
├── uploads/         # Local file uploads sorted by media categories (auto-created)
└── README.md        # This documentation
```

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **MongoDB** (Ensure a local MongoDB server is running on `mongodb://localhost:27017/chat-app`, or update the `MONGODB_URI` environment variable in `server/.env`).

---

## Getting Started

### 1. Server Setup

Navigate to the `server/` directory, install dependencies, and start the development server:

```bash
cd server
npm install
npm run dev
```

*The server will run on [http://localhost:5000](http://localhost:5000).*

### 2. Client Setup

Navigate to the `client/` directory, install dependencies, and start the Next.js development server:

```bash
cd client
npm install
npm run dev
```

*The client will run on [http://localhost:3000](http://localhost:3000).*

---

## Verification & Local Testing Guide

To verify the real-time features locally:

1. **Open two separate browser sessions** (e.g., one standard window and one Incognito/Private window) at [http://localhost:3000](http://localhost:3000).
2. **Register two different users**:
   - In window 1: Register with Username `alice`, Name `Alice`, Email `alice@company.com`.
   - In window 2: Register with Username `bob`, Name `Bob`, Email `bob@company.com`.
3. **Initiate a Chat**:
   - In Alice's sidebar, click the **New Direct Message** button (plus-bubble icon).
   - Search for `bob` or `Bob`, and click the search result card.
   - A private chat room will open immediately.
4. **Test Real-Time Features**:
   - **Messaging**: Send text messages. They will appear instantly in both windows.
   - **Typing Indicators**: Type in Alice's window; a "Alice is typing..." indicator with pulse dots will appear in Bob's window.
   - **Presence Sync**: Close Bob's tab. Bob's indicator dot will turn grey (offline). Reopen Bob's tab; the dot turns green (online).
   - **Read Receipts**: Unseen messages will display a single grey checkmark. When Bob opens the chat window, they will show double violet checkmarks.
   - **Message Actions**: Hover over any message to select an emoji reaction, reply to it, edit its content, or delete it (for everyone).
   - **File Uploads**: Click the attachment paperclip icon to upload images, videos, audio, or PDF/docx documents. They will upload and render inline previews.
   - **Toast Notifications**: Grant notification permission when prompted. Minimize Alice's window, and send a message from Bob. A native Windows toast notification will pop up. Click the toast to bring Alice's chat window into focus.
