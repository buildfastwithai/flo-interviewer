"use client"
import Orb from "@/components/orb";
import useVapi from "@/hooks/use-vapi";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { volumeLevel, isSessionActive, toggleCall, conversation, sendMessage } = useVapi();
  const [isMobile, setIsMobile] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
  const [showForm, setShowForm] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    candidateName: "",
    position: "",
    duration: "30",
    jobDescription: "",
    skills: ""
  });

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

  // Auto-scroll transcript to bottom when new messages arrive
  useEffect(() => {
    if (transcriptRef.current && isTranscriptOpen) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [conversation, isTranscriptOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
    
    // Send form data to the AI assistant
    const formContext = `
      Candidate Name: ${formData.candidateName}
      Position: ${formData.position}
      Duration: ${formData.duration} minutes
      Job Description: ${formData.jobDescription}
      Skills: ${formData.skills}
    `;
    
    sendMessage("system", `Interview context: ${formContext}`);
  };

  const toggleTranscript = () => {
    setIsTranscriptOpen(!isTranscriptOpen);
  };

  // Process conversation to combine consecutive AI messages
  const processedConversation = () => {
    if (!conversation.length) return [];
    
    const result = [];
    let currentGroup = null;
    
    for (let i = 0; i < conversation.length; i++) {
      const message = conversation[i];
      
      // If this message is from the same speaker as the previous one (either AI or user)
      if (currentGroup && message.role === currentGroup.role) {
        // Only combine if the current message is final or both are not final
        if (message.isFinal || (!message.isFinal && !currentGroup.isFinal)) {
          currentGroup.text += '\n\n' + message.text;
          currentGroup.timestamp = message.timestamp; // Update to the latest timestamp
          currentGroup.isFinal = currentGroup.isFinal && message.isFinal; // Only final if both are final
        } else {
          // If current message is not final but previous was, create a new group
          result.push(currentGroup);
          currentGroup = {...message};
        }
      } else {
        // If there's a current group, add it to results before starting a new one
        if (currentGroup) {
          result.push(currentGroup);
        }
        currentGroup = {...message};
      }
    }
    
    // Add the last group
    if (currentGroup) {
      result.push(currentGroup);
    }
    
    return result;
  };

  const handleEndInterview = async () => {
    if (isSessionActive) {
      await toggleCall(); // This will end the call
      // The redirect to feedback page is now handled in use-vapi.ts
    }
  };

  return (
    <main className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 text-slate-800 overflow-hidden">
      {showForm ? (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-white/50">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-indigo-600 p-3 rounded-xl shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-indigo-700 ml-3">Flo Interviewer</h1>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    id="candidateName"
                    name="candidateName"
                    value={formData.candidateName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 shadow-sm transition-all"
                    placeholder="Enter candidate name"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                    Position *
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 shadow-sm transition-all"
                    placeholder="Enter position"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Interview Duration *
                </label>
                <select
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 shadow-sm transition-all appearance-none"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,<svg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%236366F1\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>')", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center" }}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700">
                  Job Description *
                </label>
                <textarea
                  id="jobDescription"
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 shadow-sm transition-all"
                  placeholder="Enter detailed job description"
                ></textarea>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                  Required Skills *
                </label>
                <textarea
                  id="skills"
                  name="skills"
                  value={formData.skills}
                  onChange={handleInputChange}
                  required
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 shadow-sm transition-all"
                  placeholder="Enter required skills (comma separated)"
                ></textarea>
              </div>
              
              <div className="pt-5">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 px-4 rounded-lg transition-all shadow-lg hover:shadow-indigo-200 flex items-center justify-center space-x-2"
                >
                  <span>Start Interview</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Left side - Orb and controls */}
          <div className={`flex flex-col justify-center items-center ${isTranscriptOpen && !isMobile ? 'w-3/5' : 'w-full'} h-full transition-all duration-300 relative`}>
            <div className="absolute top-6 left-6 z-10 flex items-center space-x-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-indigo-700">
                  {formData.candidateName}
                </h1>
                <p className="text-sm text-indigo-500">{formData.position} • {formData.duration} min</p>
              </div>
            </div>
            
            <div className="absolute top-6 right-6 z-10 flex items-center space-x-3">
              {/* Transcript toggle button - always visible */}
              <button 
                onClick={toggleTranscript}
                className="p-2.5 bg-white/80 backdrop-blur-sm text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors border border-indigo-100 flex items-center space-x-2"
                aria-label={isTranscriptOpen ? "Hide transcript" : "Show transcript"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                {!isMobile && <span>{isTranscriptOpen ? "Hide" : "Show"}</span>}
              </button>
              
              <button 
                onClick={() => setShowForm(true)}
                className="px-4 py-2.5 bg-white/80 backdrop-blur-sm text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors flex items-center space-x-2 border border-indigo-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7"></path>
                  <path d="M19 12H5"></path>
                </svg>
                <span>Back to Setup</span>
              </button>
            </div>
            
            <div className="relative flex-1 w-full flex h-[80%] items-center justify-center">
              <Orb 
                volumeLevel={volumeLevel} 
                isSessionActive={isSessionActive} 
                toggleCall={toggleCall} 
                conversation={conversation}
              />
            </div>
            
            <div className="mb-10 text-center">
              <button
                onClick={isSessionActive ? handleEndInterview : toggleCall}
                className={`px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg flex items-center space-x-2 ${
                  isSessionActive
                    ? 'bg-red-500 hover:bg-red-600 text-white hover:shadow-red-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-200'
                }`}
              >
                {isSessionActive ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    <span>End Interview</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Start Interview</span>
                  </>
                )}
              </button>
              
              {isSessionActive && (
                <p className="text-sm text-indigo-500 mt-3 animate-pulse flex items-center justify-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                  Recording in progress
                </p>
              )}
            </div>
          </div>

          {/* Right side - Transcript */}
          <div className={`
            transition-all duration-300 ease-in-out overflow-hidden
            ${isTranscriptOpen 
              ? isMobile ? 'h-1/2 w-full' : 'w-2/5 h-full' 
              : isMobile ? 'h-0' : 'w-0'
            }
            bg-white/90 backdrop-blur-sm shadow-xl border-l border-white/50
          `}>
            {isTranscriptOpen && (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-sm">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mr-2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <h2 className="text-xl font-bold text-indigo-700">Interview Transcript</h2>
                  </div>
                  {isMobile && (
                    <button 
                      onClick={toggleTranscript}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      aria-label="Close transcript"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}
                </div>
                
                <div ref={transcriptRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                  {conversation.length === 0 ? (
                    <div className="text-gray-500 italic p-8 text-center bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-100 flex flex-col items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-3">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <p>The transcript will appear here once the interview starts</p>
                      <p className="mt-2 text-sm">Click on the orb or the Start Interview button to begin</p>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-4">
                      {processedConversation().map((message, index) => (
                        <div 
                          key={index} 
                          className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'} w-full`}
                        >
                          <div 
                            className={`max-w-[80%] p-4 rounded-xl shadow-sm transition-all ${
                              message.role === 'assistant' 
                                ? 'bg-indigo-50/80 border border-indigo-100/50 rounded-tr-xl rounded-br-xl rounded-bl-xl' 
                                : 'bg-purple-50/80 border border-purple-100/50 rounded-tl-xl rounded-bl-xl rounded-br-xl'
                            }`}
                          >
                            <div className="font-medium mb-2 flex items-center gap-2">
                              {message.role === 'assistant' ? (
                                <>
                                  <span className="inline-block w-6 h-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                    </svg>
                                  </span>
                                  <span className="text-indigo-700">AI Interviewer</span>
                                </>
                              ) : (
                                <>
                                  <span className="inline-block w-6 h-6 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                      <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                  </span>
                                  <span className="text-purple-700">You</span>
                                </>
                              )}
                              {!message.isFinal && (
                                <span className="text-sm text-gray-400 ml-2 animate-pulse flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  processing...
                                </span>
                              )}
                            </div>
                            <div className="text-gray-800 leading-relaxed whitespace-pre-line">{message.text}</div>
                            <div className="text-xs text-gray-400 mt-2 text-right">{message.timestamp}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(107, 114, 128, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(107, 114, 128, 0.5);
        }
      `}</style>
    </main>
  );
}
