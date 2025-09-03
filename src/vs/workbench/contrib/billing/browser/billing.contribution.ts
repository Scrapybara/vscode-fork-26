/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Scrapybara.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IWebviewWorkbenchService } from '../../webviewPanel/browser/webviewWorkbenchService.js';
import { IBillingService } from '../../../services/billing/common/billingService.js';

class OpenBillingSurfaceAction extends Action2 {
	static readonly ID = 'workbench.action.openBilling';

	constructor() {
		super({
			id: OpenBillingSurfaceAction.ID,
			title: localize2('openBilling', 'Open Billing'),
			category: Categories.Help,
			f1: true
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		const billingService = accessor.get(IBillingService);
		const webviewWorkbenchService = accessor.get(IWebviewWorkbenchService);

		const [plan, usage] = await Promise.all([
			billingService.getPlan(),
			billingService.getUsage()
		]);

		const title = localize('billing.title', 'Billing');
		const input = webviewWorkbenchService.openWebview({
			title,
			options: { enableFindWidget: false, disableServiceWorker: true },
			contentOptions: { allowScripts: false },
			extension: undefined
		}, 'workbench.billing', title, { preserveFocus: false });

		const percent = Math.min(100, Math.round((usage.used / Math.max(usage.limit, 1)) * 100));
		const renewal = plan.renewalDate ? plan.renewalDate : localize('billing.na', 'N/A');

		const html = `<!DOCTYPE html>
		<html>
		<head>
		<meta charset="UTF-8" />
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline';">
		<title>${title}</title>
		<style>
			:root {
				color-scheme: light dark;
				--fg: var(--vscode-foreground);
				--bg: var(--vscode-editor-background);
				--muted: var(--vscode-descriptionForeground);
				--border: var(--vscode-panel-border);
				--btn-bg: var(--vscode-button-secondaryBackground);
				--btn-fg: var(--vscode-button-secondaryForeground);
				--btn-hover: var(--vscode-button-secondaryHoverBackground);
				--accent: var(--vscode-editorInfo-foreground, #0e639c);
			}
			body { margin: 0; padding: 24px; font-family: var(--vscode-font-family); color: var(--fg); background: var(--bg); }
			.card { max-width: 680px; border: 1px solid var(--border); border-radius: 8px; padding: 20px; }
			.h { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
			.row { display: flex; gap: 16px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
			.kv { display: grid; grid-template-columns: 140px 1fr; gap: 6px 12px; margin: 12px 0; }
			.k { color: var(--muted); }
			.usage { height: 10px; background: rgba(127,127,127,0.2); border-radius: 6px; overflow: hidden; }
			.usage > span { display: block; height: 100%; width: ${percent}%; background: var(--accent); }
			.actions { display: flex; gap: 12px; margin-top: 16px; }
			.btn { display: inline-block; padding: 8px 12px; background: var(--btn-bg); color: var(--btn-fg); border-radius: 6px; text-decoration: none; border: 1px solid var(--border); }
			.btn:hover { background: var(--btn-hover); }
		</style>
		</head>
		<body>
			<div class="card">
				<div class="h">${localize('billing.header', 'Your Plan')}</div>
				<div class="kv">
					<div class="k">${localize('billing.plan', 'Plan')}</div>
					<div>${plan.name}</div>
					<div class="k">${localize('billing.status', 'Status')}</div>
					<div>${plan.status}</div>
					<div class="k">${localize('billing.renewal', 'Renewal')}</div>
					<div>${renewal}</div>
				</div>
				<div class="h">${localize('billing.usage', 'Usage')}</div>
				<div class="row">
					<div style="min-width:220px; flex: 1 1 220px;">
						<div class="usage"><span></span></div>
					</div>
					<div>${usage.used} / ${usage.limit} (${percent}%) · ${usage.period}</div>
				</div>
				<div class="actions">
					<a class="btn" href="#">${localize('billing.upgrade', 'Upgrade')}</a>
					<a class="btn" href="#">${localize('billing.portal', 'Open Billing Portal')}</a>
				</div>
			</div>
		</body>
		</html>`;

		input.webview.setHtml(html);
	}
}

registerAction2(OpenBillingSurfaceAction);

MenuRegistry.appendMenuItem(MenuId.MenubarHelpMenu, {
	group: '5_tools',
	command: {
		id: OpenBillingSurfaceAction.ID,
		title: localize({ key: 'miOpenBilling', comment: ['&& denotes a mnemonic'] }, 'Open &&Billing')
	},
	order: 9
});
