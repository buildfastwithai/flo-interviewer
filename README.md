# Flo Interviewer

A voice-based AI interviewer application built with Next.js and Vapi.ai.

## Features

- Conduct AI-powered voice interviews
- Real-time transcription of conversations
- Post-interview analysis with summary, success evaluation, and structured data
- Feedback page with detailed interview results

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
   NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## How It Works

### 1. Interview Setup

Fill out the form with:
- Candidate name
- Position
- Interview duration
- Job description
- Required skills

This information is used to customize the interview experience.

### 2. Conducting the Interview

- Click "Start Interview" to begin the voice conversation
- The orb visualizes voice activity
- Real-time transcript appears on the right side
- Click "End Interview" when finished

### 3. Feedback and Analysis

After the interview ends, you'll be redirected to the feedback page showing:
- Interview summary
- Success evaluation
- Structured data with detailed analysis

## Vapi Call Analysis

The application leverages Vapi's call analysis features:

- **Summary**: A concise overview of the interview conversation
- **Success Evaluation**: Determines if the interview was successful based on predefined criteria
- **Structured Data**: Extracts specific data points from the interview based on a JSON schema

## Technologies Used

- Next.js 13+ (App Router)
- React
- Vapi.ai for voice AI
- Tailwind CSS for styling

## Customization

To customize the interview assistant behavior, you'll need to configure your Vapi assistant through the Vapi dashboard.
