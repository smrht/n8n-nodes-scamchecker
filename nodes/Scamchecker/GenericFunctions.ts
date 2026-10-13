import { randomUUID } from 'node:crypto';

import { NodeApiError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';

export const BASE_URL = 'https://scamchecker.nl';

const KEY_URL = 'https://scamchecker.nl/api/sleutel/';

type ApiContext =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IPollFunctions;

interface JsonRpcError {
	code?: number;
	message?: string;
	data?: { retry_after?: number };
}

interface JsonRpcResponse {
	error?: JsonRpcError;
	result?: {
		isError?: boolean;
		structuredContent?: IDataObject;
		content?: Array<{ type?: string; text?: string }>;
	};
}

/**
 * Calls one tool on the Scamchecker MCP endpoint (stateless JSON-RPC 2.0) and
 * returns the structured result of the tool call. The Bearer token on the
 * credential is applied through the generic authenticate config.
 */
export async function scamcheckerApiRequest(
	this: ApiContext,
	toolName: string,
	toolArguments: Record<string, unknown> = {},
): Promise<IDataObject> {
	let response: JsonRpcResponse;
	try {
		response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'scamcheckerApi',
			{
				method: 'POST',
				url: `${BASE_URL}/mcp`,
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: {
					jsonrpc: '2.0',
					id: randomUUID(),
					method: 'tools/call',
					params: { name: toolName, arguments: toolArguments },
				},
				json: true,
			},
		)) as JsonRpcResponse;
	} catch (error) {
		const statusCode = (error as { statusCode?: number }).statusCode;
		const body = (error as { error?: JsonRpcResponse }).error;
		if (statusCode === 401) {
			throw new NodeApiError(this.getNode(), {}, {
				message: 'Invalid or revoked API key',
				description: `Check the API key on the Scamchecker API credential. Request a new key at ${KEY_URL}.`,
			});
		}
		if (statusCode === 429) {
			const retryAfter = body?.error?.data?.retry_after;
			throw new NodeApiError(this.getNode(), {}, {
				message:
					typeof retryAfter === 'number' && retryAfter > 0
						? `Rate limit reached for this API key. Try again in ${retryAfter} seconds.`
						: 'Rate limit reached for this API key. Try again later.',
				description: 'One key allows 20 checks per 10 minutes and 100 checks per day.',
			});
		}
		if (typeof statusCode === 'number') {
			throw new NodeApiError(this.getNode(), {}, {
				message: body?.error?.message ?? `The request to Scamchecker failed (status ${statusCode}).`,
			});
		}
		throw new NodeApiError(this.getNode(), {
			message: (error as Error).message ?? 'The request to Scamchecker failed.',
		});
	}

	if (response.error) {
		throw new NodeApiError(this.getNode(), {}, {
			message: response.error.message ?? 'The request to Scamchecker failed.',
		});
	}

	const result = response.result ?? {};
	if (result.isError) {
		const text = (result.content ?? []).find((entry) => entry.type === 'text')?.text;
		throw new NodeApiError(this.getNode(), {}, {
			message: text ?? 'The check failed in Scamchecker.',
		});
	}

	const payload = result.structuredContent;
	if (!payload) {
		throw new NodeApiError(this.getNode(), {}, {
			message: 'The check returned no result.',
		});
	}
	return payload;
}
