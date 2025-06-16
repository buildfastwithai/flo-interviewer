"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useVapi from "@/hooks/use-vapi";
import Image from "next/image";

export default function FeedbackPage() {
  const router = useRouter();
  const { callAnalysis, fetchCallAnalysis } = useVapi();
  const [loading, setLoading] = useState(true);

  const voice_agent_id = process.env.NEXT_PUBLIC_VOICE_AGENT_ID;

  useEffect(() => {
    // If no analysis data is available, try to fetch it or redirect back to home
    const checkAnalysisData = async () => {
    //   if (!callAnalysis.callId && !loading) {
    //     // If we have no call ID, redirect to home
    //     router.push("/");
    //   } else if (callAnalysis.callId && !callAnalysis.summary) {
        // If we have a call ID but no summary, try to fetch the analysis
        try {
        //   await fetchCallAnalysis(voice_agent_id);
        const response = await fetch(`/api/call-analysis/${voice_agent_id}`);
        const data = await response.json();
        console.log("data", data);
        } catch (error) {
          console.error("Failed to fetch call analysis:", error);
        }
    //   }
      
      // Set loading to false after a short delay to ensure we have data
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    };
    
    checkAnalysisData();
  }, [callAnalysis, router, loading, fetchCallAnalysis]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
        <div className="text-center p-8 max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-indigo-700">Analyzing Interview</h2>
          <p className="text-gray-600 mb-6">We're generating insights from your interview...</p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // If we still don't have analysis data after loading, show an error
  if (!callAnalysis.callId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
        <div className="text-center p-8 max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-3 text-gray-800">No Interview Data Found</h2>
          <p className="text-gray-600 mb-6">We couldn't find any interview data to analyze.</p>
          <button 
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="bg-indigo-600 p-3 rounded-xl shadow-md mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-indigo-700">Interview Feedback</h1>
        </div>
        <button 
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"></path>
            <path d="M19 12H5"></path>
          </svg>
          <span>Back to Home</span>
        </button>
      </div>

      {/* Summary Section */}
      <section className="mb-10 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-md border border-white/50">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Summary
        </h2>
        {callAnalysis.summary ? (
          <p className="text-gray-700 leading-relaxed">{callAnalysis.summary}</p>
        ) : (
          <p className="text-gray-500 italic">No summary available</p>
        )}
      </section>

      {/* Success Evaluation Section */}
      <section className="mb-10 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-md border border-white/50">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-500">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Evaluation
        </h2>
        {callAnalysis.success !== undefined ? (
          <div>
            <div className="flex items-center mb-4 p-3 rounded-lg bg-gray-50/80">
              <div className={`w-5 h-5 rounded-full mr-3 ${callAnalysis.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-lg">
                {callAnalysis.success ? 'Successful Interview' : 'Needs Improvement'}
              </span>
            </div>
            {typeof callAnalysis.success === 'object' && (
              <div className="mt-4 border-t pt-4">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 p-4 rounded-lg">
                  {JSON.stringify(callAnalysis.success, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 italic">No evaluation available</p>
        )}
      </section>

      {/* Structured Data Section */}
      <section className="mb-10 bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-md border border-white/50">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-700 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-indigo-500">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          Detailed Analysis
        </h2>
        {callAnalysis.structuredData ? (
          <div className="overflow-auto">
            <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 p-4 rounded-lg">
              {JSON.stringify(callAnalysis.structuredData, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500 italic">No detailed analysis available</p>
        )}
      </section>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button 
          onClick={() => router.push("/")}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition shadow-sm"
        >
          Back to Home
        </button>
        <button 
          onClick={() => window.print()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span>Print Results</span>
        </button>
      </div>
    </div>
  );
}
