import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    console.log("Generating response for prompt:", prompt.substring(0, 100) + "...");

    // Generate response using OpenAI GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional AI interviewer. Your role is to:
1. Ask questions in a natural, conversational manner
2. Never mention question numbers when speaking
3. Use the conversation history to maintain context
4. Be professional but friendly
5. If you see a specific question to ask, ask it naturally without changing the core meaning
6. Keep responses concise and focused
7. Maintain the flow of the interview

Format your response as the interviewer would speak it aloud.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("No response generated from OpenAI");
    }

    console.log("Generated response:", response.substring(0, 100) + "...");

    return NextResponse.json({ response });

  } catch (error) {
    console.error("Error generating response:", error);
    
    // Return a fallback response in case of API failure
    const fallbackResponse = "Thank you for that response. Let me continue with our interview.";
    
    return NextResponse.json(
      { 
        response: fallbackResponse,
        error: "Fallback response used due to API error"
      },
      { status: 200 } // Still return 200 with fallback
    );
  }
} 