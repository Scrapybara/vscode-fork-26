import * as vscode from 'vscode';
import { MODEL_LIST, MODEL_REGISTRY, DEFAULT_MODEL_ID } from './models';

class AIChatViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'aiAgent.chat';
	private _view?: vscode.WebviewView;
	private _currentModelId: string;

	constructor(private readonly _context: vscode.ExtensionContext, initialModelId: string) {
		this._currentModelId = initialModelId || DEFAULT_MODEL_ID;
	}

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
				if (this._currentModelId.startsWith('grok')) {
					const canned: Record<string, string> = {
						'grok-2': 'Grok 2 (demo): This is a canned response for screenshots.',
						'grok-mini': 'Grok Mini (demo): Quick stubbed reply for demo.',
					};
					const response = canned[this._currentModelId] ?? 'Grok (demo): Stubbed response.';
					webview.postMessage({ type: 'response', text: response });
				} else {
					const response = `Echo: ${text}`;
					webview.postMessage({ type: 'response', text: response });
				}
			}
		});
	}

	public setModel(id: string) {
		this._currentModelId = id;
		this._view?.webview.postMessage({ type: 'modelChanged', label: this._currentModelLabel });
	}

	public post(text: string) {
		this._view?.webview.postMessage({ type: 'response', text });
	}

	private get _currentModelLabel() {
		return MODEL_REGISTRY[this._currentModelId]?.label ?? this._currentModelId;
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const nonce = getNonce();
		const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'styles.css'));
		const initialModelLabel = this._currentModelLabel.replace(/"/g, '\\"');
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
	<header class="ai-header">AI Chat — <span id="modelLabel"></span></header>
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
		const modelLabelEl = document.getElementById('modelLabel');
		modelLabelEl.textContent = "${initialModelLabel}";

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
			if (msg?.type === 'modelChanged') {
				modelLabelEl.textContent = msg.label || '';
			}
		});

		addMessage('Hi! This is a stubbed demo chat.','assistant');
	</script>
</body>
</html>`;
	}
}

export async function activate(context: vscode.ExtensionContext) {
	const currentModelId = await loadCurrentModel(context);
	const provider = new AIChatViewProvider(context, currentModelId);
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
		}),
		vscode.commands.registerCommand('aiAgent.selectModel', async () => {
			const pick = await vscode.window.showQuickPick(
				MODEL_LIST.map(m => ({ label: m.label, description: `${m.contextTokens.toLocaleString()} tokens`, picked: m.id === currentModelId, id: m.id } as (vscode.QuickPickItem & { id: string }))),
				{ title: 'Select AI Model' }
			);
			if (pick && 'id' in pick) {
				await saveCurrentModel(context, pick.id);
				provider.setModel(pick.id);
			}
		})
	);
}

export function deactivate() {}

async function loadCurrentModel(context: vscode.ExtensionContext): Promise<string> {
	const configUri = vscode.Uri.joinPath(context.extensionUri, 'config', 'ai-agent.json');
	try {
		const buf = await vscode.workspace.fs.readFile(configUri);
		const json = JSON.parse(new TextDecoder().decode(buf));
		const id = typeof json?.currentModel === 'string' ? json.currentModel : undefined;
		if (id && MODEL_REGISTRY[id]) {
			return id;
		}
	} catch {
		// ignore
	}
	await saveCurrentModel(context, DEFAULT_MODEL_ID);
	return DEFAULT_MODEL_ID;
}

async function saveCurrentModel(context: vscode.ExtensionContext, id: string): Promise<void> {
	const configDir = vscode.Uri.joinPath(context.extensionUri, 'config');
	const configUri = vscode.Uri.joinPath(configDir, 'ai-agent.json');
	try { await vscode.workspace.fs.createDirectory(configDir); } catch {}
	const content = JSON.stringify({ currentModel: id }, null, 2);
	await vscode.workspace.fs.writeFile(configUri, new TextEncoder().encode(content));
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 16; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
