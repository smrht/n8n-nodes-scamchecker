# Scamchecker n8n node

This is an [n8n](https://n8n.io) community node. It lets you use [Scamchecker](https://scamchecker.nl) in your n8n workflows.

Scamchecker checks suspicious email, SMS or WhatsApp messages for signs of fraud: lookalike domains, domains registered only days ago, IBAN payment requests, pressure tactics and impersonation of well-known brands. A check returns a verdict, what looks wrong and what to do next.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In short: in n8n, go to **Settings → Community Nodes**, select **Install**, and enter the package name `n8n-nodes-scamchecker`.

## Getting an API key

1. Open [scamchecker.nl/api/sleutel/](https://scamchecker.nl/api/sleutel/).
2. Enter your email address and complete the check. Keys are free.
3. Copy the API key (it starts with `sc_` and is shown only once) and paste it into the **Scamchecker API** credential in n8n.

## Credential

**Scamchecker API**: paste your API key. The node sends it as a Bearer token. The credential test calls `GET /api/v1/whoami`, which is free and does not use one of your checks.

## Operations

### Scamchecker node

**Check Message** checks a suspicious message. Every check costs one of your key's checks.

- **Message Text** (required): the suspicious email, SMS or WhatsApp text.
- **Message URL** (optional): a link from the message. When set, Scamchecker checks the link itself instead of the message text.

The node returns flat fields:

- **verdict**: `fake`, `suspicious`, `no_red_flags` or `unclear`.
- **summary**: one-sentence explanation of the verdict.
- **checked_text**: the text as it was checked (for a URL: the URL itself).
- **signals**: one line per suspicious element found, with the findings for each.
- **impersonates**: the brand the message pretends to be, when detected.
- **advice**: the recommended next steps, one per line.
- **channel**: `email`, `sms`, `whatsapp`, `website`, `telefoon` or `unknown`.
- **country_hint**: `nl` or `be`, when detected.

A result without red flags is never a guarantee that a message is genuine. When in doubt, check via the official app, website or the number on your card.

## Rate limits

Each key allows **20 checks per 10 minutes** and **100 checks per day**. When you exceed a limit, the node returns an error that states how many seconds to wait (`retry_after`).

## Privacy

Checks are storage-free: Scamchecker never stores or logs message content — no request body, no message text, no model answers. Only the status code and duration of a check may be logged, and nothing is written to Scamchecker's databases. The suspicious link in a message is never opened; domain age is looked up at a domain registry, which receives only the domain name. See the [privacy page](https://scamchecker.nl/privacy) for the full policy.

## Compatibility

Tested with n8n 2.x. Requires a self-hosted n8n instance.

## Resources

- [Scamchecker](https://scamchecker.nl)
- [How it works](https://scamchecker.nl/hoe-het-werkt)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Version history

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
