# Example Configuration

This example shows how to configure the Homey MCP server in your `settings.json`
file.

## Installation

### Option 1: Install as a Gemini CLI Extension

```bash
gemini extensions install homey-mcp-server
```

### Option 2: Link for Development

```bash
cd packages/cli/src/commands/extensions/examples/homey-mcp-server
npm install
npm run build
gemini extensions link .
```

## Configuration

Add the following to your `~/.gemini/settings.json` or `.gemini/settings.json`
file:

```json
{
  "mcpServers": {
    "homeyServer": {
      "command": "node",
      "args": ["/path/to/homey-mcp-server/dist/homey.js"],
      "env": {
        "HOMEY_CLIENT_ID": "$HOMEY_CLIENT_ID",
        "HOMEY_CLIENT_SECRET": "$HOMEY_CLIENT_SECRET",
        "HOMEY_API_URL": "$HOMEY_API_URL"
      }
    }
  }
}
```

Replace `/path/to/homey-mcp-server` with the actual path to the extension.

## Environment Variables

Set the following environment variables before starting Gemini CLI:

```bash
export HOMEY_CLIENT_ID="your-homey-client-id"
export HOMEY_CLIENT_SECRET="your-homey-client-secret"
export HOMEY_API_URL="https://api.athom.com"  # Optional, defaults to https://api.athom.com
```

Or add them to your shell profile (e.g., `~/.bashrc`, `~/.zshrc`):

```bash
echo 'export HOMEY_CLIENT_ID="your-homey-client-id"' >> ~/.bashrc
echo 'export HOMEY_CLIENT_SECRET="your-homey-client-secret"' >> ~/.bashrc
```

## Usage Examples

### List All Devices

```
Please list all my Homey devices
```

### Turn On a Device

```
Turn on the Living Room Light
```

### Toggle a Device

```
Toggle the Kitchen Light
```

### Use the Control Device Prompt

```bash
/control-device "Bedroom Light" on
```

## Verification

After configuration, verify the server is connected:

```bash
/mcp
```

You should see `homeyServer` listed as `CONNECTED` with the available tools:

- `list_devices`
- `toggle_device`

And the available prompt:

- `control-device`
