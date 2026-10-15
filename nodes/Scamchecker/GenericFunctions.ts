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

export interface ScamcheckerCheckPayload {
	text?: string;
	url?: string;
}

interface ScamcheckerErrorBody {
	error?: string;
	retry_after?: number;
}

const ERROR_MESSAGES: Record<string, string> = {
	bad_type: 'The request has an invalid format.',
	empty: 'Provide a message text or a message URL.',
	too_long: 'The message text is too long (max 8,000 characters; a URL max 2,048).',
	too_large: 'The screenshot is larger than 6 MB.',
	upstream: 'The check failed in Scamchecker. Try again later.',
	busy: 'Scamchecker reached its daily check limit. Try again tomorrow.',
};

/**
 * Calls the Scamchecker REST API (`POST /api/check`) and returns the check
 * result. The Bearer token on the credential is applied through the generic
 * authenticate config; the credential test uses `GET /api/v1/whoami`.
 */
export async function scamcheckerApiRequest(
	this: ApiContext,
	payload: ScamcheckerCheckPayload,
): Promise<IDataObject> {
	let response: IDataObject;
	try {
		response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'scamcheckerApi',
			{
				method: 'POST',
				url: `${BASE_URL}/api/check`,
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: payload,
				json: true,
			},
		)) as IDataObject;
	} catch (error) {
		const statusCode = (error as { statusCode?: number }).statusCode;
		const errorBody = (error as { error?: ScamcheckerErrorBody }).error;
		if (statusCode === 401) {
			throw new NodeApiError(this.getNode(), {}, {
				message: 'Invalid or revoked API key',
				description: `Check the API key on the Scamchecker API credential. Request a new key at ${KEY_URL}.`,
			});
		}
		if (statusCode === 429) {
			const retryAfter = errorBody?.retry_after;
			throw new NodeApiError(this.getNode(), {}, {
				message:
					typeof retryAfter === 'number' && retryAfter > 0
						? `Rate limit reached for this API key. Try again in ${retryAfter} seconds.`
						: 'Rate limit reached for this API key. Try again later.',
				description: 'One key allows 20 checks per 10 minutes and 100 checks per day.',
			});
		}
		if (typeof statusCode === 'number') {
			const reason = errorBody?.error ? ERROR_MESSAGES[errorBody.error] : undefined;
			throw new NodeApiError(this.getNode(), {}, {
				message: reason ?? `The request to Scamchecker failed (status ${statusCode}).`,
			});
		}
		throw new NodeApiError(this.getNode(), {
			message: (error as Error).message ?? 'The request to Scamchecker failed.',
		});
	}

	if (!response || typeof response.verdict !== 'string') {
		throw new NodeApiError(this.getNode(), {}, {
			message: 'The check returned no result.',
		});
	}
	return response;
}
