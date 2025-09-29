---
title: Agent Chat
description: Chat with Claude-powered agents using the Claude Code TypeScript SDK
---

# Agent Chat

> The agent chat screen delivers low-latency, streaming conversations powered by the Claude Code TypeScript SDK.

## Feature Overview
- Navigate to `/agents/{agentId}/chat` to open a dedicated conversation workspace for any Claude agent.
- The front end streams responses from the `@anthropic-ai/claude-code` `query({ prompt, options })` API.
- Each request automatically inherits the agent system prompt, tool permissions, and configured knowledge base paths.
- The UI supports incremental output, clearing the transcript, and cancelling the current generation.

## Prerequisites
1. **Claude model** - In the agent settings choose the `claude` provider and confirm the desired model parameters.
2. **API key** - Export a `CLAUDE_API_KEY` in the runtime environment or configure `llmConfig.apiKeyRef` to point at an environment variable.
3. **Optional knowledge base** - Populate `knowledgeBasePaths` when the agent should allow Claude Code to read local documentation during a chat session.
4. **Tool policy** - Adjust `config/settings/tools-config.json` if you need to allow tools beyond the default Read, Edit, Write, Glob, Grep, and Bash set.

<Tip>
  For the full SDK reference see `docs/claude-code-docs/Claude_Code_SDK/TypeScript_SDK_参考.md` inside the repository.
</Tip>

## Conversation Flow
1. Open the agent list, pick an agent, and click **Chat**.
2. Type a prompt and press Enter or click **Send**. The UI adds your message and a streaming assistant placeholder immediately.
3. Claude Code returns NDJSON chunks. Each `delta` event updates the assistant bubble; the final `done` event removes the streaming state.
4. Use **Stop** to abort the active generation via an `AbortController`, or **Clear chat** to reset the transcript to the welcome message.

## API Contract
The UI submits the complete history to `/api/agents/{id}/chat`.

```json
POST /api/agents/agent-demo/chat
{
  "messages": [
    { "role": "assistant", "content": "Hi, I'm agent-demo." },
    { "role": "user", "content": "Summarise the deploy failures from today." }
  ],
  "options": {
    "maxTurns": 6
  }
}
```

The route responds with newline-delimited JSON:

```text
{"type":"delta","text":"Checking the latest deployment logs..."}
{"type":"delta","text":"Found 3 failed jobs on staging."}
{"type":"done","text":"Checking the latest deployment logs..."}
```

The client merges every `delta` into the most recent assistant message and closes the stream when a `done` or `error` event arrives.

## Troubleshooting
- **Missing API key** - make sure `CLAUDE_API_KEY` is available or update `llmConfig.apiKeyRef` for the agent.
- **Unsupported provider** - the chat API only works with Claude agents; switch the provider to `claude` in the agent editor.
- **No streaming output** - verify the Claude Code CLI is installed on the host and run `claude doctor` if necessary.
- **Knowledge base ignored** - double-check that the configured directories exist and are readable by the server process.

Review `logs/claude-chat.log` (if enabled) together with the browser network panel for detailed diagnostics, or consult the SDK troubleshooting guide bundled with the repository.
