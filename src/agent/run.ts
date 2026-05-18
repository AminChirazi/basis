import Anthropic from "@anthropic-ai/sdk";
import { type AgentContext, agentTools, runTool } from "@/agent/tools";

const AGENT_MODEL = "claude-sonnet-4-6";
const MAX_TURNS = 8;

function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "You are the back office agent for Basis. You help run a small",
    "company's back office: projects, time tracking, and invoicing.",
    "Use the tools to take real actions on the user's behalf. Be",
    "concise. After you act, confirm what you did in one short",
    "sentence. If a request is ambiguous, ask one clarifying question",
    "instead of guessing.",
    `Today's date is ${today}.`,
  ].join(" ");
}

/** One tool call the agent made, surfaced to the UI. */
export interface AgentStep {
  tool: string;
  input: unknown;
}

export interface AgentResult {
  reply: string;
  steps: AgentStep[];
}

/**
 * Run the back office agent for a single user message.
 *
 * Each call is independent: the agent has the tools and the
 * organization scope, runs a tool-use loop until it produces a
 * final answer, and returns that answer plus the actions it took.
 */
export async function runAgent(params: {
  message: string;
  context: AgentContext;
}): Promise<AgentResult> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: params.message },
  ];
  const steps: AgentStep[] = [];

  // Cache the system prompt and tool definitions: the loop sends
  // them unchanged on every turn.
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } },
  ];
  const tools = agentTools.map((tool, index) =>
    index === agentTools.length - 1
      ? { ...tool, cache_control: { type: "ephemeral" as const } }
      : tool,
  );

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const reply = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      return { reply: reply || "Done.", steps };
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      steps.push({ tool: block.name, input: block.input });
      let result: unknown;
      try {
        result = await runTool(
          block.name,
          block.input as Record<string, unknown>,
          params.context,
        );
      } catch (error) {
        result = {
          error: error instanceof Error ? error.message : String(error),
        };
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "The agent reached its step limit before finishing.",
    steps,
  };
}
