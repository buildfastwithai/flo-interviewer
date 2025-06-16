import { NextResponse } from 'next/server';
import { VapiClient } from "@vapi-ai/server-sdk";





// This would typically use the Vapi API client to fetch call analysis
// For now, we'll simulate the API response
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const client = new VapiClient({ token: process.env.VAPI_API_KEY || "" });
        const assistant = await client.assistants.get(process.env.NEXT_PUBLIC_VOICE_AGENT_ID || "");

        // console.log("assistant", assistant);
        // console.log("assistant", assistant.id);
        // const callId = params.id;

        // if (!callId) {
        //     return NextResponse.json(
        //         { error: 'Call ID is required' },
        //         { status: 400 }
        //     );
        // }
        // console.log("callId", callId);

        // In a real implementation, you would use the Vapi API to fetch call analysis
        // Example (pseudo-code):
        const apiKey = process.env.VAPI_API_KEY;
        const response = await fetch(`https://api.vapi.ai/call/17500805378420.061840430624566234`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        const data = await response.json();
        console.log("data", data);
        // const summary = await assistant.analysisPlan?.summaryPlan;
        // const success = await assistant.analysisPlan?.successEvaluationPlan;
        // const structuredData = await assistant.analysisPlan?.structuredDataPlan;
        // console.log("summary", summary);
        // console.log("success", success);
        // console.log("structuredData", structuredData);

        // For now, we'll return a simulated response
        return NextResponse.json({
            callId: assistant.id,
            // summary: summary,
            // success: success,
            // structuredData: structuredData
        });

    } catch (error) {
        console.error('Error fetching call analysis:', error);
        return NextResponse.json(
            { error: 'Failed to fetch call analysis' },
            { status: 500 }
        );
    }
} 