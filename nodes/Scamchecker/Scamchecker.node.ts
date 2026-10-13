import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { scamcheckerApiRequest } from './GenericFunctions';

const VERDICTS: Record<string, string> = {
	nep: 'fake',
	verdacht: 'suspicious',
	geen_rode_vlaggen: 'no_red_flags',
	onduidelijk: 'unclear',
};

interface CheckFinding {
	label?: string;
}

interface CheckSignal {
	value?: string;
	findings?: CheckFinding[];
}

interface CheckResult {
	verdict?: string;
	summary?: string;
	checked_text?: string;
	signals?: CheckSignal[];
	impersonates?: string | null;
	next_steps?: string[];
	channel?: string;
	country_hint?: string | null;
}

/**
 * Flattens the structured check result into plain string fields, with the
 * Dutch verdict values translated to English (same mapping as the Zapier app).
 */
function flattenCheck(check: CheckResult): IDataObject {
	const signals = (check.signals ?? []).map((signal) => {
		const findings = (signal.findings ?? []).map((finding) => finding.label).join('; ');
		return findings ? `${signal.value}: ${findings}` : signal.value;
	});
	return {
		verdict: (check.verdict && VERDICTS[check.verdict]) || check.verdict || '',
		summary: check.summary ?? '',
		checked_text: check.checked_text ?? '',
		signals: signals.join('\n'),
		impersonates: check.impersonates ?? '',
		advice: (check.next_steps ?? []).join('\n'),
		channel: check.channel ?? 'unknown',
		country_hint: check.country_hint ?? '',
	};
}

export class Scamchecker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Scamchecker',
		name: 'scamchecker',
		icon: { light: 'file:scamchecker.svg', dark: 'file:scamchecker.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] === "checkMessage" ? "Check Message" : ""}}',
		description: 'Check suspicious messages for signs of fraud via Scamchecker',
		defaults: {
			name: 'Scamchecker',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'scamcheckerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Check Message',
						value: 'checkMessage',
						description:
							'Check a suspicious email, SMS or WhatsApp message for signs of fraud',
						action: 'Check a message',
					},
				],
				default: 'checkMessage',
			},
			{
				displayName: 'Message Text',
				name: 'messageText',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				displayOptions: {
					show: {
						operation: ['checkMessage'],
					},
				},
				default: '',
				description: 'The suspicious email, SMS or WhatsApp text (max 8,000 characters)',
			},
			{
				displayName: 'Message URL',
				name: 'messageUrl',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['checkMessage'],
					},
				},
				default: '',
				placeholder: 'https://...',
				description:
					'A link from the message (max 2,048 characters). When set, Scamchecker checks the link itself instead of the message text.',
			},
		] as INodeProperties[],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				if (operation !== 'checkMessage') {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
						itemIndex,
					});
				}

				const toolArguments: Record<string, unknown> = {
					text: this.getNodeParameter('messageText', itemIndex) as string,
				};
				const messageUrl = this.getNodeParameter('messageUrl', itemIndex, '') as string;
				if (messageUrl !== '') {
					toolArguments.url = messageUrl;
				}

				const check = (await scamcheckerApiRequest.call(
					this,
					'check_message',
					toolArguments,
				)) as unknown as CheckResult;

				returnData.push({ json: flattenCheck(check), pairedItem: { item: itemIndex } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}
