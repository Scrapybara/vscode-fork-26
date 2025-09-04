import * as vscode from 'vscode';

function nonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
	const n = nonce();
	const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'nonce-${n}'; script-src 'nonce-${n}';" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Billing</title>
	<link rel="stylesheet" href="${styleUri}" nonce="${n}" />
</head>
<body>
	<h1>Choose your plan</h1>
	<div class="status" id="status">Current plan: Free</div>
	<div class="plans">
		<div class="card">
			<header>Free</header>
			<div class="body">
				<div class="price">$0</div>
				<ul>
					<li>Basic features</li>
					<li>Community support</li>
				</ul>
			</div>
		</div>
		<div class="card">
			<header>Pro</header>
			<div class="body">
				<div class="price">$12/mo</div>
				<ul>
					<li>Unlimited projects</li>
					<li>Priority support</li>
				</ul>
				<button id="upgrade-pro">Upgrade to Pro</button>
			</div>
		</div>
		<div class="card">
			<header>Team</header>
			<div class="body">
				<div class="price">$29/mo</div>
				<ul>
					<li>Seats and billing</li>
					<li>Advanced controls</li>
				</ul>
				<button id="upgrade-team">Upgrade to Team</button>
			</div>
		</div>
	</div>
	<div class="footer">This is a demo for screenshots only.</div>
	<script nonce="${n}">
		const vscode = acquireVsCodeApi();
		document.getElementById('upgrade-pro')?.addEventListener('click', () => {
			vscode.postMessage({ type: 'upgrade', plan: 'Pro' });
		});
		document.getElementById('upgrade-team')?.addEventListener('click', () => {
			vscode.postMessage({ type: 'upgrade', plan: 'Team' });
		});
		window.addEventListener('message', (e) => {
			if (e.data?.type === 'status') {
				document.getElementById('status').textContent = e.data.text;
			}
		});
	</script>
</body>
</html>`;
}

export function activate(context: vscode.ExtensionContext) {
	const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
	statusItem.text = 'Billing';
	statusItem.command = 'billing.open';
	statusItem.show();
	context.subscriptions.push(statusItem);

	const openCmd = vscode.commands.registerCommand('billing.open', () => {
		const panel = vscode.window.createWebviewPanel('billing', 'Billing', vscode.ViewColumn.Active, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
		});
		panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);
		panel.webview.onDidReceiveMessage(msg => {
			if (msg?.type === 'upgrade') {
				vscode.commands.executeCommand('billing.upgrade', msg.plan);
			}
		});
	});

	const upgradeCmd = vscode.commands.registerCommand('billing.upgrade', async (plan?: string) => {
		const picked = plan ?? 'Pro';
		await vscode.window.showInformationMessage(`Upgraded to ${picked} successfully.`);
	});

	context.subscriptions.push(openCmd, upgradeCmd);
}

export function deactivate() {}
