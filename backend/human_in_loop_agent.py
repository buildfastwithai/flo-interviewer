import asyncio
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# LangGraph / LangChain imports
from langgraph.graph import MessagesState, StateGraph, START, END
from langgraph.types import Command, interrupt
from langgraph.checkpoint.memory import InMemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

# Reuse question fetching/instruction context from the existing agent
from agent import extract_questions_from_template


class StartRequest(BaseModel):
    name: str
    accessCode: str
    practice: Optional[bool] = False
    recordId: Optional[str] = None
    role: Optional[str] = None


class MessageRequest(BaseModel):
    thread_id: str
    message: str


class ResumeRequest(BaseModel):
    thread_id: str
    input: str


class ChatResponse(BaseModel):
    thread_id: str
    messages: List[Dict[str, Any]]
    awaiting_user: Optional[Dict[str, Any]] = None
    meta: Optional[Dict[str, Any]] = None


app = FastAPI(title="FloCareer Human-in-Loop Interview Agent")

# Enable CORS for local development (adjust allow_origins for prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # consider restricting to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global memory/checkpointer for multi-turn sessions
memory = InMemorySaver()


def _print_ai_message_debug(ai: AIMessage) -> None:
    try:
        print("\n================================== Ai Message ==================================\n")
        content = ai.content
        if content is not None:
            try:
                # content may be str or structured; print safely
                if isinstance(content, str):
                    print(content)
                else:
                    from pprint import pformat
                    print(pformat(content))
            except Exception:
                print(str(content))

        tool_calls = getattr(ai, "tool_calls", None)
        if tool_calls is None:
            # Some providers expose raw tool calls under additional_kwargs
            tool_calls = getattr(ai, "additional_kwargs", {}).get("tool_calls")
        if tool_calls:
            print("Tool Calls:")
            from pprint import pformat
            for tc in tool_calls:
                name = tc.get("name")
                tid = tc.get("id")
                args = tc.get("args")
                if name and tid:
                    print(f"  {name} ({tid})")
                    print(f" Call ID: {tid}")
                if args is not None:
                    print("  Args:")
                    for line in pformat(args, width=100).splitlines():
                        print(f"    {line}")
    except Exception:
        pass


def _print_tool_message_debug(tool_msg: ToolMessage) -> None:
    try:
        print("\n================================= Tool Message =================================\n")
        name = getattr(tool_msg, "name", None)
        if name:
            print(f"Name: {name}")
            print("")
        content = tool_msg.content
        if content is not None:
            print(str(content))
    except Exception:
        pass


def build_instructions(
    *,
    candidate_name: str,
    role: str,
    practice_mode: bool,
    questions_list: str,
    all_questions: List[str],
) -> str:
    """Construct the same style of instructions as backend/agent.py."""
    if practice_mode:
        full_instructions = f"""
You are a warm, friendly interviewer running a short practice session before the real interview. Your goal is to help the candidate get comfortable with the interface and the flow.

PRACTICE SESSION:
- This is a brief practice round with 2-3 very easy questions
- Ask the following questions in order, and keep the conversation light
- After practice, ask if they're ready to start the real interview

QUESTIONS TO ASK (IN EXACT ORDER):
{questions_list}

YOU MUST FOLLOW THESE RULES:
1. ONLY ask the practice questions shown above, in the exact order (1, 2, 3)
2. You MAY answer questions about the interview structure, what the candidate needs to do, expectations, and basic rules. Keep answers brief and friendly.
3. Do not reveal correct answers or provide hints for technical questions.
4. Guardrails: If asked about the job description (JD), company, role details, compensation/CTC, hiring process/next steps, or feedback about performance, reply exactly: "I don't have that specific information, but the hiring team can provide all the details you need."
5. After each answer, acknowledge it naturally before moving to the next question.
6. At the end of practice, say: "We can wrap up practice here. Are you ready to start the real interview?"
7. If the candidate says they don't know, respond supportively with something like "That's completely fine, these can be tricky".

The candidate's name is {candidate_name}.
The role is {role}.
\n+HUMAN-IN-THE-LOOP:
- IMPORTANT: When you need the user's choice or clarification, you MUST call the tool `AskHumanSpec` with a short `question` instead of asking directly in your reply. Do not proceed until the user's response arrives.
""".strip()
        return full_instructions

    if all_questions and questions_list:
        full_instructions = f"""
You are a warm, professional interviewer conducting a technical interview. Create a comfortable, conversational atmosphere while maintaining structure.

QUESTIONS TO ASK (IN EXACT ORDER):
{questions_list}

YOU MUST FOLLOW THESE RULES:
1. Ask questions in the given order, one at a time. Do not skip.
2. Present each question conversationally but preserve the core content.
3. Acknowledge each answer naturally before moving on.
4. If the candidate says they don't know, respond supportively (e.g., "That's completely fine, these can be tricky").
5. Never answer questions yourself or give hints. Do not reveal correct answers.
6. Guardrails: If asked about the JD, company, role details, compensation/CTC, hiring process/next steps, or performance feedback, reply exactly: "I don't have that specific information, but the hiring team can provide all the details you need."
7. Limit follow-ups to at most 1-2 per question, 6 total.
8. Do not mention question numbers explicitly when speaking.

The candidate's name is {candidate_name}.
The role is {role}.
\n+HUMAN-IN-THE-LOOP:
- IMPORTANT: When you need the user's choice or clarification, you MUST call the tool `AskHumanSpec` with a short `question` instead of asking directly in your reply. Do not proceed until the user's response arrives.
""".strip()
        return full_instructions

    # Fallback minimal instructions
    return (
        f"You are an interviewer for {role}. Be warm and professional. "
        "Follow the question order if provided. If asked about JD/company/CTC/next steps/feedback, "
        "reply exactly: 'I don't have that specific information, but the hiring team can provide all the details you need.' "
        "When you need the user's choice or a clarification, call the AskHumanSpec tool with a short question and wait."
    )


# Define a small, HIL-capable ReAct agent with an explicit ask-human step
class AskHumanSpec(BaseModel):
    """Ask the human a question"""
    question: str


def create_graph() -> StateGraph:
    model = ChatOpenAI(model="gpt-4o-mini", temperature=0.6)
    # Bind the mock AskHuman tool to allow the model to request human input explicitly
    bound = model.bind_tools([AskHumanSpec])

    def call_model(state: MessagesState):
        messages = state["messages"]
        response = bound.invoke(messages)
        return {"messages": [response]}

    def should_continue(state: MessagesState):
        last = state["messages"][-1]
        if isinstance(last, AIMessage):
            tool_calls = getattr(last, "tool_calls", None)
            if not tool_calls:
                tool_calls = getattr(last, "additional_kwargs", {}).get("tool_calls")
            if tool_calls:
                name = tool_calls[0].get("name")
                if name == "AskHumanSpec":
                    return "ask_human"
                # No other real tools here; end turn by default
        return END

    def ask_human(state: MessagesState):
        last = state["messages"][-1]
        tool_calls = getattr(last, "tool_calls", None)
        if not tool_calls:
            tool_calls = getattr(last, "additional_kwargs", {}).get("tool_calls", [])
        tool_call = tool_calls[0]
        tool_call_id = tool_call.get("id")
        args = tool_call.get("args", {}) or {}
        question = args.get("question") or "Please provide your input."
        user_input = interrupt(question)
        # Return a ToolMessage that resolves the tool call
        return {
            "messages": [
                ToolMessage(tool_call_id=tool_call_id, content=user_input, name="AskHumanSpec")
            ]
        }

    workflow = StateGraph(MessagesState)
    workflow.add_node("agent", call_model)
    workflow.add_node("ask_human", ask_human)
    workflow.add_edge(START, "agent")
    workflow.add_conditional_edges("agent", should_continue, {"ask_human": "ask_human", END: END})
    # After human response, go back to agent
    workflow.add_edge("ask_human", "agent")
    return workflow


# Compile once; use a shared checkpointer so threads are isolated by thread_id
graph_app = create_graph().compile(checkpointer=memory)


def _collect_stream_values(stream_iter) -> Dict[str, Any]:
    messages_out: List[Dict[str, Any]] = []
    awaiting: Optional[Dict[str, Any]] = None

    for event in stream_iter:
        # Stream in updates mode yields node-name keyed payloads
        if not isinstance(event, dict):
            continue
        for _node, payload in event.items():
            if not isinstance(payload, dict):
                continue
            if "__interrupt__" in payload:
                intr = payload["__interrupt__"][0]
                question = getattr(intr, "value", None) or "Please provide input"
                awaiting = {"question": question}
                try:
                    print("\n------------------------------ HIL Interrupt ----------------------------------\n")
                    print(str(question))
                except Exception:
                    pass
            if "messages" in payload:
                for m in payload["messages"]:
                    try:
                        if isinstance(m, AIMessage):
                            content = m.content if isinstance(m.content, str) else str(m.content)
                            messages_out.append({"role": "assistant", "content": content})
                            _print_ai_message_debug(m)
                            # Fallback: if the model issued AskHumanSpec tool call but interrupt
                            # hasn't been surfaced yet, synthesize awaiting from tool args
                            tool_calls = getattr(m, "tool_calls", None) or getattr(m, "additional_kwargs", {}).get("tool_calls")
                            if tool_calls and awaiting is None:
                                tc = tool_calls[0] or {}
                                if tc.get("name") == "AskHumanSpec":
                                    q = (tc.get("args") or {}).get("question")
                                    if q:
                                        awaiting = {"question": q}
                                        try:
                                            print("\n------------------------------ HIL Interrupt (synthetic) ----------------------\n")
                                            print(str(q))
                                        except Exception:
                                            pass
                        elif isinstance(m, ToolMessage):
                            # Tool messages are internal; skip
                            _print_tool_message_debug(m)
                    except Exception:
                        pass

    return {"messages": messages_out, "awaiting": awaiting}


@app.post("/hil/start", response_model=ChatResponse)
async def start_chat(req: StartRequest):
    thread_id = str(uuid.uuid4())

    # Derive questions from dynamic template if available
    all_questions: List[str] = []
    questions_list = ""
    role = req.role or "Software Engineer"

    if req.practice:
        # Same practice questions as backend/agent.py
        all_questions = [
            "What is the difference between hardware and software?",
            "What is the main purpose of an internet browser?",
            "What is the purpose of an input and an output in programming?",
        ]
        for i, q in enumerate(all_questions):
            questions_list += f"{i+1}. {q}\n\n"
    elif req.recordId:
        try:
            qs, ql, fetched_role, _skills, _dur = await extract_questions_from_template(req.recordId, "chat-room")
            if qs:
                all_questions = qs
            if ql:
                questions_list = ql
            if fetched_role:
                role = fetched_role
        except Exception:
            # Fall back silently if template couldn't be loaded
            all_questions = all_questions

    instructions = build_instructions(
        candidate_name=req.name,
        role=role,
        practice_mode=bool(req.practice),
        questions_list=questions_list,
        all_questions=all_questions,
    )

    # Prime the conversation with a system message and a kickoff user cue
    initial = {
        "messages": [
            SystemMessage(content=instructions),
            HumanMessage(content=f"Hi, I'm {req.name}. Please start the interview."),
        ]
    }

    config = {"configurable": {"thread_id": thread_id}}

    loop = asyncio.get_event_loop()
    stream = graph_app.stream(initial, config, stream_mode="updates")
    payload = await loop.run_in_executor(None, lambda: _collect_stream_values(stream))

    return ChatResponse(
        thread_id=thread_id,
        messages=payload["messages"],
        awaiting_user=payload["awaiting"],
        meta={"role": role, "questions_total": len(all_questions)},
    )


@app.post("/hil/message", response_model=ChatResponse)
async def send_message(req: MessageRequest):
    if not req.thread_id:
        raise HTTPException(status_code=400, detail="thread_id required")

    config = {"configurable": {"thread_id": req.thread_id}}
    # If the graph is currently waiting on human input, treat this as a resume
    try:
        state = graph_app.get_state(config)
        next_node = getattr(state, "next", None)
    except Exception:
        next_node = None

    loop = asyncio.get_event_loop()
    if next_node == "ask_human":
        stream = graph_app.stream(Command(resume=req.message), config, stream_mode="updates")
    else:
        user_input = {"messages": [HumanMessage(content=req.message)]}
        stream = graph_app.stream(user_input, config, stream_mode="updates")
    payload = await loop.run_in_executor(None, lambda: _collect_stream_values(stream))

    return ChatResponse(
        thread_id=req.thread_id,
        messages=payload["messages"],
        awaiting_user=payload["awaiting"],
    )


@app.post("/hil/resume", response_model=ChatResponse)
async def resume_interruption(req: ResumeRequest):
    if not req.thread_id:
        raise HTTPException(status_code=400, detail="thread_id required")

    config = {"configurable": {"thread_id": req.thread_id}}

    loop = asyncio.get_event_loop()
    stream = graph_app.stream(Command(resume=req.input), config, stream_mode="updates")
    payload = await loop.run_in_executor(None, lambda: _collect_stream_values(stream))

    return ChatResponse(
        thread_id=req.thread_id,
        messages=payload["messages"],
        awaiting_user=payload["awaiting"],
    )


# Allow running this module directly
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)


