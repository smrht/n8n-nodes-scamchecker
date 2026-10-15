# Changelog

## 0.2.0

- The node calls the Scamchecker REST API (`POST /api/check`) instead of the MCP endpoint; no JSON-RPC.
- Resource **Message** with operation **Check**; typed parameters.
- **Message URL** moved into the **Options** collection; message text is optional when a URL is set.
- Credential test verifies the key against `GET /api/v1/whoami` (free, no check consumed).

## 0.1.0

- Initial release: `Scamchecker` node with the Check Message operation and the `Scamchecker API` credential.
