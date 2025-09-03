/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Scrapybara.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';

export const IBillingService = createDecorator<IBillingService>('billingService');

export interface BillingPlanInfo {
	name: string;
	status: 'active' | 'trial' | 'past_due' | 'canceled';
	renewalDate?: string;
}

export interface BillingUsageInfo {
	used: number;
	limit: number;
	period: 'monthly' | 'annual';
}

export interface IBillingService {
	readonly _serviceBrand: undefined;

	readonly onDidChange: Event<void>;

	getPlan(): Promise<BillingPlanInfo>;
	getUsage(): Promise<BillingUsageInfo>;
	openPortal(): Promise<void>;
}

class PlaceholderBillingService extends Disposable implements IBillingService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChange = this._register(new Emitter<void>());
	readonly onDidChange = this._onDidChange.event;

	async getPlan(): Promise<BillingPlanInfo> {
		return {
			name: 'Free',
			status: 'active',
			renewalDate: undefined
		};
	}

	async getUsage(): Promise<BillingUsageInfo> {
		return {
			used: 0,
			limit: 100,
			period: 'monthly'
		};
	}

	async openPortal(): Promise<void> {
		// Placeholder: no-op for now
		return;
	}
}

registerSingleton(IBillingService, PlaceholderBillingService, InstantiationType.Delayed);
