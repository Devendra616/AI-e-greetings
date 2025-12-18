
# 🌹 Artisanal E-Greetings

**Artisanal E-Greetings** is a bespoke digital stationery platform that transforms standard greetings into cinematic, multi-sensory experiences. Designed with the eye of a senior artist with over 20 years of experience and powered by the **Google Gemini 3 & Veo** series models, this application bridges the gap between high-end physical stationery and modern digital convenience.

## 🎨 The Vision
In an era of generic instant messages, the "art of the greeting" has been lost. This project restores that sentiment by using Generative AI to craft personalized messages, high-fidelity editorial photography, professional-grade voice narration, and cinematic video transitions—all centered around the user's specific context and identity.

---

## 🚀 Key Features

### 1. **Context-Aware Message Curation**
Leveraging `gemini-3-flash-preview`, the app generates three distinct thematic options for every greeting:
*   **Poetic**: Rich, metaphorical, and timeless.
*   **Modern & Bright**: Crisp, energetic, and contemporary.
*   **Warm & Deeply Personal**: Focused on shared history and emotional depth.

### 2. **Identity-Preserving Imagery**
Using `gemini-2.5-flash-image` with "Subject-Lock" logic:
*   Users can upload a **Photo Inspiration**.
*   The AI treats the photo as the definitive identity reference, ensuring the generated artwork maintains the exact likeness of the subject while reimagining them in a cinematic, lush environment.

### 3. **Cinematic Video Generation (Veo Integration)**
For a truly "Masterpiece" experience, the app utilizes `veo-3.1-fast-generate-preview` to:
*   Animate the subject of the photo with fluid, graceful motion.
*   Create a 5-second cinematic loop that serves as a living greeting card.

### 4. **Professional Voice Narration**
Integrated `gemini-2.5-flash-preview-tts` provides high-fidelity audio narration of the chosen message, featuring:
*   **Emotional Depth**: The model is prompted to speak with "warmth and sincerity."
*   **Artisanal Player**: A custom-built audio UI with real-time progress tracking and volume control.

### 5. **High-Fidelity Export Suite**
*   **Masterpiece PNG**: Uses `html-to-image` to capture the entire card layout—including artisanal typography and generated art—at 3x pixel density.
*   **MP4 Download**: Direct export of the cinematic video for sharing on high-end social platforms.
*   **Artisanal Sharing**: Glassmorphic sharing palette for X, Facebook, and WhatsApp.
*   **PDF/Print Support**: A dedicated CSS media-print layer that re-layouts the card for physical printing on landscape stationery.

---

## 🛠 Technical Architecture

*   **Frontend**: React 19 + TypeScript.
*   **Styling**: Tailwind CSS + Google Fonts (Playfair Display & Inter).
*   **Intelligence**: `@google/genai` SDK.
*   **Imaging & Video**: Gemini 2.5 Flash (Image) & Veo 3.1 (Video).
*   **Audio**: Gemini 2.5 Flash Native Audio (TTS).
*   **Canvas Capture**: `html-to-image` for layout snapshots.

---

## 📝 How it Works

1.  **Input Details**: Provide names, occasion, and relationship context.
2.  **Visual Inspiration**: Optionally upload a photo of the recipient to "lock" their identity.
3.  **Tone Selection**: Choose from three AI-drafted messages that best fit your feelings.
4.  **Generative Synthesis**: The engine simultaneously prepares the visual art, video, and audio narration.
5.  **Review & Export**: Play the cinematic card and download it as a high-res image or video masterpiece.

---

## ⚠️ Requirements for Cinematic Video

Generating video via the Veo model requires a **Paid Google Cloud Project**. 
*   If "Cinematic Video" is selected, the application will prompt the user to select their API key through the secure AI Studio interface. 
*   Ensure billing is enabled on your project at [ai.google.dev/gemini-api/docs/billing](https://ai.google.dev/gemini-api/docs/billing).

---

## 🏛 Artisanal Layout Details
The card itself uses a **Perspective-3D** container that reacts to the user's presence, creating a tactile feel. The typography follows classic editorial standards, utilizing high-contrast serif fonts for names and light, italicized weights for the core message.

*"Crafting emotions into art, one card at a time."*
