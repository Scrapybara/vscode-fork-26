# AI Agent (Built-in Demo)

A minimal built-in extension that contributes an AI activity bar icon and a sidebar chat view for demo screenshots only.

- Activity Bar container id: `workbench.viewContainer.ai`
- View id: `aiAgent.chat` ("AI Chat")
- Commands:
  - `AI: Open Chat Sidebar` (`aiAgent.open`) focuses the AI view container
  - `AI: Send Message` (`aiAgent.sendMessage`) posts a stubbed echo reply to the chat

Notes
- The chat is a simple webview view with no networking; responses are stubbed.
- Styling uses flat colors and `--ai-accent: #00aaaa`.

## Design guideline: flat colors only
- No purple gradients allowed. Use flat colors only.
- The palette is defined in `media/styles.css` using simple CSS variables (no gradients).
- Avoid the following in styles: `linear-gradient`, `radial-gradient`, `conic-gradient`, `purple`, `#8a2be2`, `#800080`.
- Run `npm run lint:styles` from this folder to enforce the rule.

> TODO (optional): Add a Stylelint setup extending `stylelint-config-standard` and a custom rule banning gradients for stricter linting.
