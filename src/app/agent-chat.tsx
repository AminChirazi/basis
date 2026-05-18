"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface ChatMessage {
  role: "you" | "agent";
  text: string;
  steps?: string[];
}

const SUGGESTIONS = [
  "Log 2 hours on Website redesign for design review",
  "What time has been logged this month?",
  "Invoice the law firm for all billable time at 150 EUR per hour",
];

export function AgentChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function send(message: string): Promise<void> {
    const text = message.trim();
    if (!text || pending) return;
    setMessages((current) => [...current, { role: "you", text }]);
    setInput("");
    setPending(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessages((current) => [
          ...current,
          { role: "agent", text: data.error ?? "Something went wrong." },
        ]);
      } else {
        setMessages((current) => [
          ...current,
          {
            role: "agent",
            text: data.reply,
            steps: (data.steps ?? []).map(
              (step: { tool: string }) => step.tool,
            ),
          },
        ]);
        // Reflect whatever the agent changed in the dashboard tables.
        router.refresh();
      }
    } catch {
      setMessages((current) => [
        ...current,
        { role: "agent", text: "Request failed." },
      ]);
    }
    setPending(false);
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="card agent">
      <strong>Agent</strong>
      <p className="muted" style={{ margin: "0.25rem 0 0.75rem" }}>
        Run the back office by asking.
      </p>

      {messages.length === 0 ? (
        <div className="agent-suggestions">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="secondary"
              onClick={() => void send(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : (
        <div className="agent-log">
          {messages.map((message, index) => (
            <div key={index} className={`agent-msg ${message.role}`}>
              <span className="agent-role">{message.role}</span>
              <span>{message.text}</span>
              {message.steps && message.steps.length > 0 && (
                <span className="muted agent-steps">
                  ran: {message.steps.join(", ")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="row" style={{ marginTop: "0.75rem" }}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the agent to do something..."
          style={{ flex: 1 }}
          disabled={pending}
        />
        <button type="submit" disabled={pending}>
          {pending ? "Working..." : "Send"}
        </button>
      </form>
    </div>
  );
}
