# Voxa

**Find your words.**

## The Problem

For people who experience difficulty communicating through speech, expressing even a simple thought can sometimes require navigating complicated interfaces or constructing a sentence piece by piece.

## The Idea

Voxa combines visual communication with intelligent language assistance. Users select the concepts they want to communicate, and Voxa helps turn those selections into a natural phrase.

## Core Principle

**The user determines the meaning. Voxa helps with the words.**

## Features

- Accessible visual sentence builder with 100+ seeded communication choices
- Direct, natural, and detailed communication styles
- Private local language engine with optional secure Gemini assistance
- Browser text-to-speech with explicit Speak controls
- Conversation mode with contextual response suggestions
- Saved phrases, favorites, custom buttons, routines, and history
- Demo profiles and persistent accessibility settings
- Guided Demo Mode and usage-patterns view
- Responsive desktop, tablet, and mobile layouts
- Secure Supabase email accounts with verification and password recovery
- Per-user cloud sync protected by row-level security

## Architecture

Voxa uses a React interface running on the Vinext/Vite Sites stack. Supabase Auth provides verified email accounts and persistent sessions, while account-owned communication data and preferences sync through row-level-security policies. The local communication engine provides reliable phrase generation without internet access. When `GEMINI_API_KEY` is configured, the server-only `/api/generate` route can ask Gemini for a natural phrasing; failures immediately fall back to the local engine. Speech uses the browser Web Speech API.

## Running Voxa

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local`, add the Supabase project URL and publishable key, and add `GEMINI_API_KEY` only if optional Gemini assistance is wanted. Never place secret keys in client-side code.

## Possible Future Features

- Multilingual communication
- Cloud profile synchronization
- Dedicated tablet application
- Offline language models and speech
- Customizable AAC symbol libraries
- Shared phrase libraries
- Improved contextual suggestions
- Switch-control and eye-tracking accessibility
- AAC hardware integration

Voxa is an assistive communication exploration. It does not replace AAC devices, speech-language professionals, medical care, or accessibility professionals.
