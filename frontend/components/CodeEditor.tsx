"use client"

import { useState, useEffect, useRef } from "react"
import Editor from "@monaco-editor/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy, Check, Maximize2, Minimize2, Moon, Sun, Play, Terminal, Loader2, Sparkles, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeEditorProps {
  language?: string
  defaultValue?: string
  defaultTheme?: string
  height?: string
  width?: string
  onChange?: (value: string | undefined) => void
  className?: string
  readOnly?: boolean
  onRun?: (code: string) => void
  serverExecution?: boolean
  forceAI?: boolean
}

export function CodeEditor({
  language = "javascript",
  defaultValue = "// Write your code here",
  defaultTheme = "vs",
  height = "500px",
  width = "100%",
  onChange,
  className,
  readOnly = false,
  onRun,
  serverExecution = false,
  forceAI = false,
}: CodeEditorProps) {
  const [theme, setTheme] = useState(defaultTheme)
  const [code, setCode] = useState(defaultValue)
  const [copied, setCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [output, setOutput] = useState<string>("")
  const [isRunning, setIsRunning] = useState(false)
  const [showOutput, setShowOutput] = useState(false)
  const [isAiExecution, setIsAiExecution] = useState(false)
  const [timestamp, setTimestamp] = useState("")
  const [isHtmlPreview, setIsHtmlPreview] = useState(false)
  const editorRef = useRef<any>(null)
  const previewRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Update code when defaultValue changes
    setCode(defaultValue);
  }, [defaultValue]);

  // Check if we should use AI execution
  useEffect(() => {
    const shouldUseAi = forceAI || (
      serverExecution && (
        language === 'typescript' || 
        language === 'c' || 
        language === 'cpp' ||
        language === 'java' ||
        language === 'python' ||
        language === 'C++'
      )
    );
    setIsAiExecution(shouldUseAi);
    
    // Reset HTML preview when language changes
    setIsHtmlPreview(language === 'html');
  }, [language, serverExecution, forceAI]);

  // Update the preview when code changes and we're in HTML mode
  useEffect(() => {
    if (language === 'html' && previewRef.current && showOutput) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        updateHtmlPreview();
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [code, showOutput, language]);

  // Helper function to safely execute scripts in correct order
  const executeScriptsSequentially = (doc: Document, scripts: HTMLScriptElement[], index = 0) => {
    if (index >= scripts.length) return;
    
    const script = scripts[index];
    const newScript = doc.createElement('script');
    
    // Copy all attributes
    Array.from(script.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    
    // Handle external scripts properly
    if (script.src) {
      newScript.onload = () => executeScriptsSequentially(doc, scripts, index + 1);
      newScript.onerror = () => executeScriptsSequentially(doc, scripts, index + 1);
      newScript.src = script.src;
      script.parentNode?.replaceChild(newScript, script);
    } else {
      // Inline script
      newScript.textContent = script.textContent;
      script.parentNode?.replaceChild(newScript, script);
      executeScriptsSequentially(doc, scripts, index + 1);
    }
  };

  const updateHtmlPreview = () => {
    if (previewRef.current) {
      const iframe = previewRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        // Clear the iframe
        iframeDoc.open();
        
        // Write the HTML content
        iframeDoc.write(code);
        
        // Close the document first to ensure complete DOM construction
        iframeDoc.close();
        
        // Short delay to ensure DOM is fully ready
        setTimeout(() => {
          // Get all scripts for sequential execution
          const scripts = Array.from(iframeDoc.getElementsByTagName('script'));
          if (scripts.length > 0) {
            executeScriptsSequentially(iframeDoc, scripts);
          }
        }, 75);
      }
    }
  };

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
  }

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "")
    if (onChange) {
      onChange(value)
    }
  }

  const handleAiExecution = async () => {
    try {
      const response = await fetch('/api/ai-code-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute code with AI');
      }
      
      // Format the output
      let formattedOutput = '';
      
      if (data.output) {
        formattedOutput = `${data.output}`;
      }
      
      if (data.error && data.error.trim()) {
        formattedOutput += `\n// Error:\n${data.error}`;
      }
      
      if (!formattedOutput) {
        formattedOutput = '// No output from AI simulation';
      }
      
      setOutput(formattedOutput);
      
    } catch (error) {
      setOutput(`// Error with AI execution:\n${error instanceof Error ? error.message : String(error)}\n\n// Note: This feature requires an OpenAI API key to be configured on the server.`);
    }
  };
  
  const handleServerExecution = async () => {
    try {
      const response = await fetch('/api/code-execution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });
      console.log(language);

      const data = await response.json();
      console.log(data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute code');
      }
      
      // Format the output
      let formattedOutput = '';
      
      if (data.output) {
        formattedOutput += `${data.output}`;
      }
      
      if (data.error && data.error.trim()) {
        formattedOutput += `// Error:\n${data.error}\n`;
      }
      
      if (!formattedOutput) {
        formattedOutput = '// No output';
      }
      
      setOutput(formattedOutput);
      
    } catch (error) {
      // Fallback to AI execution for Java, Python, C++, C, and TypeScript when server execution fails
      if (language === 'java' || language === 'python' || language === 'cpp' || language === 'c' || language === 'typescript' ) {
        setOutput(``);
        await handleAiExecution();
      } else {
        setOutput(`// Error:\n${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };

  const handleClientExecution = async () => {
    try {
      // Create a safe execution environment
      const originalConsoleLog = console.log;
      const logs: string[] = [];
      
      // Override console.log to capture output
      console.log = (...args) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
        originalConsoleLog(...args);
      };
      
      // Use Function constructor to evaluate code safely
      const result = new Function(code)();
      
      // Restore original console.log
      console.log = originalConsoleLog;
      
      // Set output with both returned result and console logs
      setOutput(
        "// Console output:\n" + 
        (logs.length ? logs.join('\n') : '// No console output') + 
        "\n\n// Return value:\n" + 
        (result !== undefined ? String(result) : '// No return value')
      );
    } catch (error: any) {
      setOutput(`// Error:\n${error.toString()}`);
    }
  };

  const handleRun = async () => {
    if (!code) return;
    
    // For HTML, just show the preview
    if (language === 'html') {
      setShowOutput(true);
      setTimeout(() => {
        updateHtmlPreview();
      }, 150);
      return;
    }
    
    setIsRunning(true);
    setShowOutput(true);
    setOutput("Running code...");
    
    // Set current timestamp
    const now = new Date();
    setTimestamp(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    
    try {
      // Use AI execution for TypeScript, C, and C++ or if forceAI is true
      if (isAiExecution) {
        await handleAiExecution();
      }
      // Use server-side execution if specified
      else if (serverExecution) {
        await handleServerExecution();
      }
      // Use client-side execution for JavaScript
      else if (language === "javascript") {
        await handleClientExecution();
      }
      // Use the provided onRun handler for custom execution
      else if (onRun) {
        onRun(code);
      }
      // Default to server execution for non-JavaScript code
      else {
        await handleServerExecution();
      }
    } catch (error: any) {
      setOutput(`// Error:\n${error.toString()}`);
    } finally {
      setIsRunning(false);
    }
  }

  const themes = [
    { label: "Light", value: "vs", icon: Sun },
    { label: "Dark", value: "vs-dark", icon: Moon },
    { label: "High Contrast", value: "hc-black", icon: null },
  ]

  return (
    <Card className={cn(
      "relative bg-white text-gray-800 border border-gray-200", 
      isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none" : "",
      className
    )}>
      <div className="flex items-center justify-between gap-2 p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-[140px] bg-white border-gray-200">
              <SelectValue placeholder="Select theme">
                {theme && (
                  <div className="flex items-center gap-2">
                    {theme === "vs" && <Sun className="h-4 w-4" />}
                    {theme === "vs-dark" && <Moon className="h-4 w-4" />}
                    <span>
                      {theme === "vs" ? "Light" : theme === "vs-dark" ? "Dark" : "High Contrast"}
                    </span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {themes.map((themeOption) => (
                <SelectItem key={themeOption.value} value={themeOption.value}>
                  <div className="flex items-center gap-2">
                    {themeOption.icon && <themeOption.icon className="h-4 w-4" />}
                    <span>{themeOption.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" 
                className="bg-white border-gray-200 hover:bg-gray-100"
                size="icon" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-600 hover:text-green-700" /> : <Copy className="h-4 w-4 text-gray-600 hover:text-gray-800" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy code"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" 
                className={cn(
                  "bg-white border-gray-200 hover:bg-gray-100",
                  isAiExecution && "border-purple-200 bg-purple-50 hover:bg-purple-100",
                  language === 'html' && "border-blue-200 bg-blue-50 hover:bg-blue-100"
                )}
                size="icon" onClick={handleRun} disabled={isRunning}>
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : language === 'html' ? (
                    <Eye className="h-4 w-4 text-blue-600 hover:text-blue-700" />
                  ) : (
                    <Play className="h-4 w-4 text-gray-600 hover:text-green-600" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language === 'html' ? "Preview HTML" : "Run code"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" 
                className="bg-white border-gray-200 hover:bg-gray-100"
                size="icon" onClick={() => setShowOutput(!showOutput)}>
                  <Terminal className="h-4 w-4 text-gray-600 hover:text-gray-800" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showOutput ? (language === 'html' ? "Hide preview" : "Hide output") : (language === 'html' ? "Show preview" : "Show output")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" 
                className="bg-white border-gray-200 hover:bg-gray-100"
                size="icon" onClick={toggleFullscreen}>
                  {isFullscreen ? 
                    <Minimize2 className="h-4 w-4 text-gray-600 hover:text-gray-800" /> : 
                    <Maximize2 className="h-4 w-4 text-gray-600 hover:text-gray-800" />
                  }
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider> */}
        </div>
      </div>
      <CardContent className="p-0 relative">
        <div className={cn(
          "grid transition-all duration-200",
          showOutput ? "grid-rows-[1fr_200px]" : "grid-rows-[1fr_0px]"
        )}>
          <Editor
            height={isFullscreen ? 
              (showOutput ? "calc(100vh - 260px)" : "calc(100vh - 60px)") : 
              (showOutput ? `calc(${height} - 200px)` : height)
            }
            width={width}
            language={language}
            value={code}
            theme={theme}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: readOnly,
              wordWrap: "on",
            }}
            className="rounded-t-lg overflow-hidden"
          />
          
          {language === 'html' ? (
            <div className={cn(
              "bg-white border-t border-gray-200 transition-all duration-200 overflow-hidden",
              showOutput ? "h-[200px]" : "h-0 opacity-0"
            )}>
              <div className="bg-gray-50 text-gray-800 px-3 py-1 text-xs flex items-center justify-between border-b border-gray-200">
                <span>HTML Preview</span>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                  <div className="w-3 h-3 rounded-full bg-blue-200"></div>
                </div>
              </div>
              <iframe 
                ref={previewRef}
                className="w-full h-[168px] border-none" 
                title="HTML Preview"
                sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-downloads allow-presentation"
              />
            </div>
          ) : (
            <div className={cn(
              "bg-black text-green-400 font-mono text-sm overflow-auto transition-all duration-200 flex flex-col",
              showOutput ? "h-[200px]" : "h-0 opacity-0",
              isAiExecution && "border-t-purple-500"
            )}>
              <div className="bg-gray-800 text-white px-3 py-1 text-xs flex items-center justify-between border-b border-gray-700">
                <span>Command Prompt - Code Execution</span>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                </div>
              </div>
              <div className="p-3 h-full overflow-auto font-mono bg-black">
                <div className="text-gray-500 text-xs mb-1">Microsoft Windows [Version 10.0.19045.3930]</div>
                <div className="text-gray-500 text-xs mb-2">(c) Microsoft Corporation. All rights reserved.</div>
                
                <div className="flex flex-col">
                  <div className="text-gray-400 text-xs mb-1">{timestamp}</div>
                  <div className="flex items-start">
                    <span className="text-white mr-2">C:\Users\User&gt;</span>
                    <span className="text-yellow-300">{language === 'javascript' ? 'node index.js' : language === 'python' ? 'python index.py' : language === 'java' ? 'javac Main.java && java Main' : language === 'c' ? 'gcc Main.c && ./a.out' : language === 'cpp' ? 'g++ Main.cpp && ./a.out' : language === 'typescript' ? 'ts-node index.ts' : ''}</span>
                  </div>
                  
                  <div className="mt-2 pl-2 border-l-2 border-gray-700">
                    <pre className="whitespace-pre-wrap leading-relaxed">{output || "// Waiting for code execution..."}</pre>
                  </div>
                  
                  <div className="flex items-center mt-1">
                    <span className="text-white mr-2">C:\Users\User&gt;</span>
                    <span className={cn("inline-block w-2 h-4 bg-green-400", isRunning ? "animate-pulse" : "")}></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}