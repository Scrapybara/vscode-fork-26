import * as vscode from 'vscode';

class AIChatViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'aiAgent.chat';
	private _view?: vscode.WebviewView;

	constructor(private readonly _context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		this._view = webviewView;
		const { webview } = webviewView;
		webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._context.extensionUri, 'media')
			]
		};

		webview.html = this._getHtmlForWebview(webview);

		webview.onDidReceiveMessage(async (msg) => {
			if (msg?.type === 'send' && typeof msg.text === 'string') {
				const text: string = msg.text.trim();
				if (!text) { return; }
				// Stubbed response only
				const response = `Echo: ${text}`;
				webview.postMessage({ type: 'response', text: response });
			}
		});
	}

	public post(text: string) {
		this._view?.webview.postMessage({ type: 'response', text });
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const nonce = getNonce();
		const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'styles.css'));
		return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<link href="${stylesUri}" rel="stylesheet">
	<title>AI Chat</title>
</head>
<body>
	<header class="ai-header">AI Chat</header>
	<main class="ai-main">
		<div id="messages" class="ai-messages" aria-live="polite"></div>
		<div class="ai-input">
			<textarea id="input" rows="3" placeholder="Type a message…"></textarea>
			<button id="send" class="ai-send">Send</button>
		</div>
	</main>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const messages = document.getElementById('messages');
		const input = document.getElementById('input');
		const send = document.getElementById('send');

		function addMessage(text, role) {
			const el = document.createElement('div');
			el.className = 'ai-msg ' + (role === 'user' ? 'user' : 'assistant');
			el.textContent = text;
			messages.appendChild(el);
			messages.scrollTop = messages.scrollHeight;
		}

		send.addEventListener('click', () => {
			const text = input.value.trim();
			if (!text) { return; }
			addMessage(text, 'user');
			vscode.postMessage({ type: 'send', text });
			input.value = '';
			input.focus();
		});

		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				send.click();
				e.preventDefault();
			}
		});

		window.addEventListener('message', (event) => {
			const msg = event.data;
			if (msg?.type === 'response') {
				addMessage(msg.text, 'assistant');
			}
		});

		addMessage('Hi! This is a stubbed demo chat.','assistant');
	</script>
</body>
</html>`;
	}
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new AIChatViewProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(AIChatViewProvider.viewId, provider),
		vscode.commands.registerCommand('aiAgent.open', async () => {
			await vscode.commands.executeCommand('workbench.view.extension.workbench.viewContainer.ai');
		}),
		vscode.commands.registerCommand('aiAgent.sendMessage', async () => {
			const value = await vscode.window.showInputBox({ prompt: 'Send a message to AI Chat' });
			if (value) {
				provider.post(`Echo: ${value}`);
			}
		})
	);
}

export function deactivate() {}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 16; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
