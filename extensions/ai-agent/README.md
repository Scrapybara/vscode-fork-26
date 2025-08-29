# AI Agent (Built-in Demo)

A minimal built-in extension that contributes an AI activity bar icon and a sidebar chat view for demo screenshots only.

- Activity Bar container id: `workbench.viewContainer.ai`
- View id: `aiAgent.chat` ("AI Chat")
- Commands:
  - `AI: Open Chat Sidebar` (`aiAgent.open`) focuses the AI view container
  - `AI: Send Message` (`aiAgent.sendMessage`) posts a stubbed echo reply to the chat

Notes
- The chat is a simple webview view with no networking; responses are stubbed.
- Styling uses flat colors and `--ai-accent: #0aa`.
