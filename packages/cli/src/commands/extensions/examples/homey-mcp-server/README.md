# Homey MCP Server

This MCP (Model Context Protocol) server provides integration between Gemini CLI and Homey smart home systems. It allows you to list and control Homey devices through the Gemini CLI interface.

## Features

- **List Devices**: Get a comprehensive list of all devices connected to your Homey system
- **Toggle Devices**: Turn devices on/off or set specific capability values
- **Secure Authentication**: Uses environment variables for client ID and secret
- **Flexible Control**: Supports toggling current state or setting explicit values

## Setup

### Prerequisites

- Homey account with API access
- Homey Client ID and Client Secret
- Node.js 20 or higher

### Installation

1. Install the extension using Gemini CLI:

```bash
gemini extensions install homey-mcp-server
```

Or link for development:

```bash
cd packages/cli/src/commands/extensions/examples/homey-mcp-server
npm install
npm run build
gemini extensions link .
```

### Configuration

Set the following environment variables before using the server:

```bash
export HOMEY_CLIENT_ID="your-client-id"
export HOMEY_CLIENT_SECRET="your-client-secret"
export HOMEY_API_URL="https://api.athom.com"  # Optional, defaults to https://api.athom.com
```

You can also configure these in your `settings.json`:

```json
{
  "mcpServers": {
    "homeyServer": {
      "command": "node",
      "args": ["path/to/homey-mcp-server/dist/homey.js"],
      "env": {
        "HOMEY_CLIENT_ID": "$HOMEY_CLIENT_ID",
        "HOMEY_CLIENT_SECRET": "$HOMEY_CLIENT_SECRET",
        "HOMEY_API_URL": "$HOMEY_API_URL"
      }
    }
  }
}
```

## Usage

### List All Devices

The `list_devices` tool retrieves all devices from your Homey system:

```
Please list all my Homey devices
```

This will return a JSON response containing:
- Device ID
- Device name
- Zone
- Device class
- Capabilities
- Current state

### Toggle a Device

The `toggle_device` tool allows you to control devices:

```
Turn on the Living Room Light
```

Or more explicitly:

```
Set the device with ID "abc123" to on
```

You can also:
- Toggle without specifying a value (will switch to opposite state)
- Set specific capabilities (e.g., "dim" for brightness)
- Set numeric or string values for compatible capabilities

### Quick Control Prompt

Use the `control-device` prompt for quick device control:

```bash
/control-device --deviceName="Living Room Light" --action="on"
```

Or with positional arguments:

```bash
/control-device "Living Room Light" on
```

Actions supported:
- `on`: Turn device on
- `off`: Turn device off
- `toggle`: Switch to opposite state (default)

## API Reference

### Tools

#### `list_devices`

Lists all devices connected to your Homey smart home system.

**Parameters**: None

**Returns**: 
```json
{
  "devices": [
    {
      "id": "device-id",
      "name": "Device Name",
      "zone": "Zone Name",
      "class": "light",
      "capabilities": ["onoff", "dim"],
      "state": {
        "onoff": { "value": true, "type": "boolean" },
        "dim": { "value": 0.5, "type": "number" }
      }
    }
  ],
  "count": 1
}
```

#### `toggle_device`

Toggles a Homey device on or off, or sets a specific capability value.

**Parameters**:
- `deviceId` (string, required): The unique ID of the device
- `capability` (string, optional): The capability to control (default: "onoff")
- `value` (boolean|number|string, optional): The value to set. If omitted, will toggle current state

**Returns**:
```json
{
  "success": true,
  "deviceId": "device-id",
  "capability": "onoff",
  "value": true,
  "message": "Successfully set onoff to true"
}
```

### Prompts

#### `control-device`

Quick prompt to control a Homey device by name.

**Arguments**:
- `deviceName` (string, required): Name of the device to control
- `action` (string, optional): Action to perform - "on", "off", or "toggle" (default: "toggle")

## Security Considerations

- **Never commit** your `HOMEY_CLIENT_ID` or `HOMEY_CLIENT_SECRET` to version control
- Use environment variables or secure secret management
- The server uses OAuth bearer token authentication
- All API requests are made over HTTPS

## Troubleshooting

### Authentication Errors

If you receive authentication errors:
1. Verify your `HOMEY_CLIENT_ID` and `HOMEY_CLIENT_SECRET` are correct
2. Check that the environment variables are properly set
3. Ensure your Homey account has API access enabled

### Device Not Found

If a device cannot be found:
1. Use `list_devices` to verify the device ID
2. Check that the device is online in your Homey app
3. Ensure you have permission to control the device

### Connection Issues

If you cannot connect to the Homey API:
1. Verify your `HOMEY_API_URL` is correct
2. Check your internet connection
3. Ensure the Homey API is accessible from your network

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## License

Copyright 2025 Google LLC
SPDX-License-Identifier: Apache-2.0
