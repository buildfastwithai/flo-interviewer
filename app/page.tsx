"use client"
import Orb from "@/components/orb";
import useVapi from "@/hooks/use-vapi";
import { useState, useEffect } from "react";

export default function Home() {
  const { volumeLevel, isSessionActive, toggleCall, conversation } = useVapi();
  const [isMobile, setIsMobile] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsTranscriptOpen(false);
      } else {
        setIsTranscriptOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <main className="flex flex-col md:flex-row h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Left side - Orb and controls */}
      <div className={`flex flex-col justify-center items-center ${isTranscriptOpen && !isMobile ? 'w-2/3' : 'w-full'} h-full transition-all duration-300 relative`}>
        <div className="absolute top-6 left-6 z-10">
          <h1 className="text-3xl font-bold text-gradient animate-fadeIn text-center">
            Voice AI Interview
          </h1>
        </div>
        
        {/* {isMobile && (
          <button 
            onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
            className="absolute top-6 right-6 z-10 p-2 glass rounded-full transition-colors"
            aria-label="Toggle transcript"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )} */}
        
        {/* <div className="text-center mb-6 max-w-md px-4 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-2xl font-medium mb-2">Interactive AI Interview</h2>
          <p className="text-slate-300">
            {isSessionActive 
              ? "Speaking with AI interviewer..." 
              : "Click on the orb below to start your interview"}
          </p>
        </div> */}
        
        <div className="relative flex-1 w-full flex h-[80%] items-center justify-center animate-float">
          {/* <div className={`transition-all duration-500 ${isSessionActive ? 'scale-110' : 'scale-100 hover:scale-105'}`}> */}
            <Orb 
              volumeLevel={volumeLevel} 
              isSessionActive={isSessionActive} 
              toggleCall={toggleCall} 
              conversation={conversation}
            />
          {/* </div> */}
        </div>
        
        <div className="mb-8 text-center animate-fadeIn" style={{ animationDelay: "0.2s" }}>
          <button
            onClick={toggleCall}
            className={`px-8 py-3 rounded-full font-medium transition-all shadow-lg ${
              isSessionActive
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
            }`}
          >
            {isSessionActive ? 'End Interview' : 'Start Interview'}
          </button>
        </div>
      </div>

      {/* Right side - Transcript */}
      <div className={`
        transition-all duration-300 ease-in-out overflow-hidden
        ${isTranscriptOpen 
          ? isMobile ? 'h-1/2 w-full' : 'w-1/3 h-full' 
          : isMobile ? 'h-0' : 'w-0'
        }
        bg-slate-800/70 backdrop-blur-sm border-l border-slate-700/50
      `}>
        {isTranscriptOpen && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-700/50 flex justify-between items-center backdrop-blur-sm bg-slate-800/50">
              <h2 className="text-xl font-bold">Interview Transcript</h2>
              {isMobile && (
                <button 
                  onClick={() => setIsTranscriptOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-700 transition-colors"
                  aria-label="Close transcript"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversation.length === 0 ? (
                <div className="text-slate-400 italic p-8 text-center glass rounded-xl">
                  <p>The transcript will appear here once the interview starts...</p>
                  <p className="mt-2 text-sm">Click on the orb or the Start Interview button to begin</p>
                </div>
              ) : (
                conversation.map((message, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg animate-fadeIn ${
                      message.role === 'assistant' 
                        ? 'bg-blue-900/40 ml-4 border-l-4 border-blue-500 glass' 
                        : 'bg-slate-700/60 mr-4 border-l-4 border-purple-500 glass'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="font-bold mb-1 flex items-center gap-2">
                      {message.role === 'assistant' ? (
                        <>
                          <span className="inline-block w-5 h-5 rounded-full bg-blue-500 flex-shrink-0"></span>
                          <span>AI Interviewer</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-block w-5 h-5 rounded-full bg-purple-500 flex-shrink-0"></span>
                          <span>You</span>
                        </>
                      )}
                      {!message.isFinal && (
                        <span className="text-sm text-slate-400 ml-2 animate-pulse">typing...</span>
                      )}
                    </div>
                    <div className="ml-7">{message.text}</div>
                    <div className="text-xs opacity-70 mt-2 text-right">{message.timestamp}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
