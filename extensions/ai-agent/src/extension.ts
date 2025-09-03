import * as vscode from 'vscode';

type Role = 'user' | 'assistant' | 'system';

interface ChatMessage {
	id: string;
	role: Role;
	text: string;
	ts: number;
}

type ModelId = 'grok-2' | 'grok-2-mini' | 'grok-1.5' | 'grok-1';

const GROK_MODELS: ReadonlyArray<{ id: ModelId; label: string }> = [
	{ id: 'grok-2', label: 'Grok 2' },
	{ id: 'grok-2-mini', label: 'Grok 2 Mini' },
	{ id: 'grok-1.5', label: 'Grok 1.5' },
	{ id: 'grok-1', label: 'Grok 1' }
];

function modelLabel(id: string): string {
	return GROK_MODELS.find(m => m.id === id as ModelId)?.label || id;
}

function getModel(): ModelId {
	return vscode.workspace.getConfiguration('aiAgent').get<ModelId>('grok.model', 'grok-2');
}

async function setModel(id: ModelId) {
	await vscode.workspace.getConfiguration('aiAgent').update('grok.model', id, true);
}

class AIChatViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewId = 'aiAgent.chat';
	private _view?: vscode.WebviewView;
	private readonly _storageKey = 'aiAgent.messages';

	constructor(private readonly _context: vscode.ExtensionContext) {}

	resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
		this._view = webviewView;
		const { webview } = webviewView;
		webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'media')]
		};
		webview.html = this._getHtmlForWebview(webview);

		const load = () => this._context.globalState.get<ChatMessage[]>(this._storageKey) || [];
		const save = (msgs: ChatMessage[]) => this._context.globalState.update(this._storageKey, msgs);

		webview.onDidReceiveMessage(async (msg) => {
			if (!msg || typeof msg !== 'object') { return; }
			switch (msg.type) {
				case 'requestState': {
					const state = load();
					webview.postMessage({ type: 'state', messages: state });
					const id = getModel();
					webview.postMessage({ type: 'model', id, label: modelLabel(id) });
					break;
				}
				case 'send': {
					const text = typeof msg.text === 'string' ? msg.text.trim() : '';
					if (!text) { return; }
					const history = load();
					const userMsg: ChatMessage = { id: genId(), role: 'user', text, ts: Date.now() };
					save([...history, userMsg]);
					webview.postMessage({ type: 'append', message: userMsg });
					const model = getModel();
					const response = await this._getStubbedResponse(text, model);
					const aiMsg: ChatMessage = { id: genId(), role: 'assistant', text: response, ts: Date.now() };
					save([...load(), aiMsg]);
					webview.postMessage({ type: 'append', message: aiMsg });
					break;
				}
				case 'setModel': {
					const id = typeof msg.id === 'string' ? (msg.id as ModelId) : getModel();
					await setModel(id);
					webview.postMessage({ type: 'model', id, label: modelLabel(id) });
					break;
				}
				case 'clear': {
					save([]);
					webview.postMessage({ type: 'cleared' });
					break;
				}
			}
		});

		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('aiAgent.grok.model')) {
				const id = getModel();
				this._view?.webview.postMessage({ type: 'model', id, label: modelLabel(id) });
			}
		});
	}

	public post(text: string) {
		this._view?.webview.postMessage({ type: 'append', message: { id: genId(), role: 'assistant', text, ts: Date.now() } satisfies ChatMessage });
	}

	private async _getStubbedResponse(text: string, model: ModelId): Promise<string> {
		const trimmed = text.replace(/\s+/g, ' ').slice(0, 1000);
		const prefix = modelLabel(model);
		const delayMs = model.endsWith('mini') ? 60 : 100;
		await delay(delayMs);
		return `Echo (${prefix}): ${trimmed}`;
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const nonce = getNonce();
		const stylesUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'styles.css'));
		const iconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'icon.png'));
		return `<!DOCTYPE html>
	<html lang="en">
	<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<link href="${stylesUri}" rel="stylesheet">
	<title>AI Chat</title>
	</head>
	<body>
		<header class="ai-header">
			<img class="ai-logo" src="${iconUri}" alt="" width="16" height="16"/>
			<span class="ai-title">AI Chat</span>
			<div class="ai-tools" role="toolbar" aria-label="Chat toolbar">
				<label class="ai-hint" style="margin-right:.2rem">Model</label>
				<select id="model" class="ai-select" title="Select model" aria-label="Select model">
					<option value="grok-2">Grok 2</option>
					<option value="grok-2-mini">Grok 2 Mini</option>
					<option value="grok-1.5">Grok 1.5</option>
					<option value="grok-1">Grok 1</option>
				</select>
				<button id="new" class="ai-tool" title="New chat" aria-label="New chat">New</button>
				<button id="clear" class="ai-tool" title="Clear chat" aria-label="Clear chat">Clear</button>
				<button id="copyLast" class="ai-tool" title="Copy last message" aria-label="Copy last message">Copy</button>
			</div>
		</header>
		<main class="ai-main">
			<div id="messages" class="ai-messages" aria-live="polite"></div>
			<div class="ai-input">
				<textarea id="input" rows="3" placeholder="Type a message…"></textarea>
				<div class="ai-input-actions">
					<label class="ai-hint">Enter to send • Shift+Enter for newline</label>
					<button id="send" class="ai-send">Send</button>
				</div>
			</div>
		</main>
		<script nonce="${nonce}">
			const vscode = acquireVsCodeApi();
			const messagesEl = document.getElementById('messages');
			const inputEl = document.getElementById('input');
			const sendEl = document.getElementById('send');
			const clearEl = document.getElementById('clear');
			const newEl = document.getElementById('new');
			const copyLastEl = document.getElementById('copyLast');
			const modelEl = document.getElementById('model');

			function fmt(ts){ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
			function addMessage(msg){
				const wrap=document.createElement('div');
				wrap.className='ai-msg ' + (msg.role==='user'?'user':'assistant');
				wrap.dataset.id = msg.id;
				const bubble=document.createElement('div');
				bubble.className='ai-bubble';
				bubble.textContent=msg.text;
				const meta=document.createElement('div');
				meta.className='ai-meta';
				meta.textContent = (msg.role==='user'?'You':'AI') + ' • ' + fmt(msg.ts);
				wrap.appendChild(bubble);
				wrap.appendChild(meta);
				messagesEl.appendChild(wrap);
				messagesEl.scrollTop = messagesEl.scrollHeight;
			}
			function clearAll(){
				messagesEl.innerHTML='';
				vscode.setState({ messages: [] });
			}
			function getState(){ return vscode.getState() || { messages: [] }; }
			function setState(messages){ vscode.setState({ messages }); }

			modelEl.addEventListener('change', () => {
				const id = modelEl.value;
				vscode.postMessage({ type:'setModel', id });
			});

			sendEl.addEventListener('click', () => {
				const text = inputEl.value.trim();
				if (!text) return;
				vscode.postMessage({ type:'send', text });
				inputEl.value='';
				inputEl.focus();
			});
			inputEl.addEventListener('keydown', (e) => {
				if (e.key==='Enter' && !e.shiftKey) {
					e.preventDefault();
					sendEl.click();
				}
			});
			clearEl.addEventListener('click', () => { vscode.postMessage({ type:'clear' }); });
			newEl.addEventListener('click', () => { vscode.postMessage({ type:'clear' }); });
			copyLastEl.addEventListener('click', async () => {
				const els = messagesEl.querySelectorAll('.ai-bubble');
				const last = els[els.length-1];
				if (last && navigator.clipboard) {
					try { await navigator.clipboard.writeText(last.textContent || ''); } catch {}
				}
			});

			window.addEventListener('message', (event) => {
				const msg = event.data;
				if (!msg) return;
				if (msg.type==='state') {
					clearAll();
					for (const m of msg.messages) addMessage(m);
					setState(msg.messages);
				}
				if (msg.type==='append') {
					addMessage(msg.message);
					const cur = getState().messages || [];
					setState([...cur, msg.message]);
				}
				if (msg.type==='cleared') {
					clearAll();
				}
				if (msg.type==='model') {
					modelEl.value = msg.id;
				}
			});

			(function init(){
				const s = getState();
				if (!s.messages || s.messages.length===0) {
					const hello = { id: '${'hi'}' + Math.random().toString(36).slice(2), role: 'assistant', text: 'Hi. This is a demo chat.', ts: Date.now() };
					addMessage(hello);
					setState([hello]);
				}
				vscode.postMessage({ type:'requestState' });
			})();
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
			if (value) { provider.post(`Echo (${modelLabel(getModel())}): ${value}`); }
		}),
		vscode.commands.registerCommand('aiAgent.selectModel', async () => {
			const picked = await vscode.window.showQuickPick(GROK_MODELS.map(m => m.label), { placeHolder: 'Select Grok model' });
			if (!picked) { return; }
			const entry = GROK_MODELS.find(m => m.label === picked)!;
			await setModel(entry.id);
		}),
		vscode.commands.registerCommand('aiAgent.clear', async () => {})
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

function genId(): string {
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function delay(ms: number): Promise<void> {
	return new Promise(res => setTimeout(res, ms));
}
