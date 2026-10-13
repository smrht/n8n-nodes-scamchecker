import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class ScamcheckerApi implements ICredentialType {
	name = 'scamcheckerApi';

	displayName = 'Scamchecker API';

	icon: Icon = {
		light: 'file:scamchecker.svg',
		dark: 'file:scamchecker.svg',
	};

	documentationUrl = 'https://scamchecker.nl';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
			noDataExpression: true,
			description:
				'The Scamchecker API key. Request a free key at https://scamchecker.nl/api/sleutel/',
			hint: 'The key is shown once after you request it and starts with sc_',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://scamchecker.nl',
			url: '/api/v1/whoami',
		},
	};
}
