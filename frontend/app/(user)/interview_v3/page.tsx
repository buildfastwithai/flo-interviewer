"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, MessageSquare, Loader2 } from "lucide-react";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:8010";

export default function InterviewChatV3() {
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [recordId, setRecordId] = useState("");
  const [practice, setPractice] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [awaitingQuestion, setAwaitingQuestion] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ role?: string; questions_total?: number } | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, awaitingQuestion]);

  async function startInterview() {
    setIsJoining(true);
    try {
      // First: resolve recordId via access code (if available)
      let resolvedRecordId = "";
      let resolvedRole: string | undefined;
      try {
        if (accessCode.trim()) {
          const lookup = await fetch(`/api/interview/lookup-by-access-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessCode: accessCode.trim() }),
          });
          if (lookup.ok) {
            const json = await lookup.json();
            resolvedRecordId = json?.data?.recordId || "";
            resolvedRole = json?.data?.role;
            if (resolvedRecordId) setRecordId(resolvedRecordId);
          }
        }
      } catch (e) {
        // Non-fatal: continue without recordId
      }

      const res = await fetch(`${BACKEND_URL}/hil/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, accessCode, practice, recordId: resolvedRecordId || recordId || undefined, role: resolvedRole }),
      });
      if (!res.ok) throw new Error("Failed to start interview");
      const data = await res.json();
      setThreadId(data.thread_id);
      setMessages((data.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
      setAwaitingQuestion(data.awaiting_user?.question ?? null);
      setMeta(data.meta || null);
    } catch (e) {
      console.error(e);
      alert("Could not start interview. Please try again.");
    } finally {
      setIsJoining(false);
    }
  }

  async function send() {
    if (!threadId || !input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    const isResume = Boolean(awaitingQuestion);
    try {
      const endpoint = isResume ? `${BACKEND_URL}/hil/resume` : `${BACKEND_URL}/hil/message`;
      const payload = isResume
        ? { thread_id: threadId, input: input.trim() }
        : { thread_id: threadId, message: input.trim() };
      setInput("");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      const newMsgs = (data.messages || []).map((m: any) => ({ role: m.role, content: m.content })) as ChatMessage[];
      if (newMsgs.length) setMessages((prev) => [...prev, ...newMsgs]);
      setAwaitingQuestion(data.awaiting_user?.question ?? null);
    } catch (e) {
      console.error(e);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {!threadId ? (
        <div className="w-full h-full flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2663FF]/10 via-[#1D244F]/5 to-white opacity-30 pointer-events-none" />
          <Card className="w-full max-w-2xl p-8 border border-[#F7F7FA] shadow-xl bg-gray-50 rounded-3xl relative z-10">
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2663FF]/20 to-[#1D244F]/20 rounded-full border border-[#2663FF]/30">
                  <Sparkles className="w-4 h-4 text-[#2663FF]" />
                  <span className="text-sm font-medium text-[#1D244F]">AI Interview (Chat, Human-in-loop)</span>
                </div>
                <h1 className="text-3xl font-bold text-[#1D244F]">Start Interview</h1>
                <p className="text-[#5B5F79]">Enter your details to begin the chat-based interview.</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1D244F]">Your Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1D244F]">Access Code</Label>
                  <Input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Enter access code" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1D244F]">Template Record ID</Label>
                  <Input value={recordId} readOnly placeholder="Auto-resolved from access code" className="h-12 bg-gray-100" />
                </div>
                <div className="flex items-center gap-3">
                  <input id="practice" type="checkbox" className="h-5 w-5 accent-[#2663FF]" checked={practice} onChange={(e) => setPractice(e.target.checked)} />
                  <Label htmlFor="practice" className="text-[#1D244F]">Practice Mode</Label>
                </div>
                <Button
                  onClick={startInterview}
                  disabled={isJoining || !name || !accessCode}
                  className="bg-[#f7a828] hover:bg-[#f7a828]/90 text-white h-12"
                >
                  {isJoining ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">Join Interview <MessageSquare className="w-4 h-4" /></span>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-1">
          {/* Left meta / status */}
          <div className="hidden md:flex w-72 flex-col border-r border-[#F0F0F5] bg-[#F7F7FA] p-6 gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30">Live</Badge>
            </div>
            <div className="text-sm text-[#5B5F79]">Role</div>
            <div className="text-[#1D244F] font-semibold">{meta?.role || "Interview"}</div>
            {typeof meta?.questions_total === "number" && (
              <div className="text-sm text-[#5B5F79]">Planned Questions: {meta.questions_total}</div>
            )}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            <div className="border-b border-[#F0F0F5] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#1D244F]">Interview Chat</h2>
                <Badge variant="outline" className="bg-[#2663FF]/10 text-[#2663FF] border-[#2663FF]/30">Human-in-loop</Badge>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 border text-sm max-w-[80%] ${
                        m.role === "user"
                          ? "bg-[#2663FF] text-white border-[#2663FF]"
                          : "bg-white text-[#1D244F] border-[#F0F0F5]"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {awaitingQuestion && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3 border text-sm max-w-[80%] bg-white text-[#1D244F] border-[#FFD9A6]">
                      <div className="text-[#5B5F79] mb-1">The interviewer needs your input:</div>
                      <div className="font-medium">{awaitingQuestion}</div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </ScrollArea>
            <div className="border-t border-[#F0F0F5] p-4">
              <div className="max-w-3xl mx-auto flex items-center gap-2">
                <Input
                  placeholder={awaitingQuestion ? "Type your answer…" : "Type your message…"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className="h-12"
                />
                <Button onClick={send} disabled={sending || !input.trim()} className="h-12 bg-[#f7a828] hover:bg-[#f7a828]/90 text-white">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

