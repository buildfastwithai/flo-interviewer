export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="text-center space-y-6 max-w-3xl">
        <h1 className="text-6xl font-bold tracking-tight text-foreground">Flo Interviewer</h1>
        <p className="text-xl text-muted-foreground">AI-powered interview platform for seamless candidate evaluation</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {/* Admin: JD QnA */}
          <div className="bg-card rounded-lg p-6 flex flex-col items-center text-center space-y-4 hover:bg-secondary transition-colors shadow-md">
            <div className="p-3 rounded-full bg-primary text-primary-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">JD Q&A Generator</h2>
            <p className="text-muted-foreground">Upload job descriptions and generate interview questions</p>
            <a href="/jd-qna" className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              Access JD Q&A
            </a>
          </div>
          
          {/* Admin: Create Interview */}
          <div className="bg-card rounded-lg p-6 flex flex-col items-center text-center space-y-4 hover:bg-secondary transition-colors shadow-md">
            <div className="p-3 rounded-full bg-accent text-accent-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">Create Interview</h2>
            <p className="text-muted-foreground">Set up and manage interview sessions</p>
            <a href="/create-interview" className="px-6 py-2 rounded-md bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors">
              Create Interview
            </a>
          </div>
          
          {/* User: Join Interview */}
          <div className="bg-card rounded-lg p-6 flex flex-col items-center text-center space-y-4 hover:bg-secondary transition-colors shadow-md">
            <div className="p-3 rounded-full bg-chart-3 text-accent-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"></path>
                <path d="M8 12l3 3l5 -5"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">Join Interview</h2>
            <p className="text-muted-foreground">Join your scheduled interview session</p>
            <a href="/interview" className="px-6 py-2 rounded-md bg-chart-3 text-accent-foreground font-medium hover:bg-chart-3/90 transition-colors">
              Join Session
            </a>
          </div>
        </div>
        
        <div className="mt-12 text-muted-foreground text-sm">
          Powered by AI-driven interview automation
        </div>
      </div>
    </div>
  );
}