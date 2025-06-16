# AI Voice Interview App with Transcript

This is a Next.js application that uses the Vapi AI voice API to create an interactive voice interview with real-time transcript.

## Features

- Interactive 3D Orb visualization that responds to voice input
- Real-time voice-based AI interviews
- Live transcript of the entire conversation
- Ability to mute/unmute the microphone
- Show/hide transcript panel
- Responsive design

## Getting Started

### Prerequisites

- Node.js 16+ 
- A Vapi.ai account and API keys

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

3. Create a `.env.local` file in the root of the project with your Vapi API keys:

```
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id
```

You can get these keys by:
- Signing up at [vapi.ai](https://vapi.ai)
- Creating an assistant
- Copying the public key and assistant ID

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How to Use

1. Click the "Start Interview" button or the orb to begin the interview
2. Speak clearly when answering questions
3. Your conversation will be transcribed in real-time on the right panel
4. Use the mute button if you need privacy
5. The orb will visually respond to your voice input
6. Click "End Interview" when you're done

## Technology Stack

- Next.js
- React
- Three.js (for 3D visualization)
- Vapi API (for voice AI)
- Tailwind CSS (for styling)

## License

MIT
