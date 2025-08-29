# AI Agent (Built-in Demo)

A minimal built-in extension that contributes an AI activity bar icon and a sidebar chat view for demo screenshots only.

- Activity Bar container id: `workbench.viewContainer.ai`
- View id: `aiAgent.chat` ("AI Chat")
- Commands:
  - `AI: Open Chat Sidebar` (`aiAgent.open`) focuses the AI view container
  - `AI: Send Message` (`aiAgent.sendMessage`) posts a stubbed echo reply to the chat
  - `AI: Select Model` (`aiAgent.selectModel`) switches between demo Grok model variants

Notes
- The chat is a simple webview view with no networking; responses are stubbed. When a selected model id starts with `grok`, canned responses are returned.
- Selected model is persisted in `extensions/ai-agent/config/ai-agent.json` under `currentModel`.
- Environment: A placeholder `GROK_API_KEY` may be configured in your environment for future work, but it is not used by this demo code.
- Styling uses flat colors and `--ai-accent: #0aa`.
