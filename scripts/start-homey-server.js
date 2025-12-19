#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Homey MCP Server
 *
 * This MCP server integrates Homey smart home platform with the Gemini CLI.
 * It provides tools for managing Homey devices and flows through the Model Context Protocol.
 *
 * Required environment variables:
 * - CLIENT_ID: Your Homey API client ID
 * - CLIENT_SECRET: Your Homey API client secret
 *
 * Usage:
 * 1. Copy .env.example to .env and fill in your credentials
 * 2. Add to your Gemini CLI settings.json:
 *    {
 *      "mcpServers": {
 *        "homey": {
 *          "command": "node",
 *          "args": ["scripts/start-homey-server.js"],
 *          "env": {
 *            "CLIENT_ID": "$HOMEY_CLIENT_ID",
 *            "CLIENT_SECRET": "$HOMEY_CLIENT_SECRET"
 *          }
 *        }
 *      }
 *    }
 * 3. Run: gemini
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
dotenv.config({ path: join(rootDir, '.env') });

// Validate required environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const HOMEY_API_URL = process.env.HOMEY_API_URL || 'https://api.athom.com';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Missing required environment variables.');
  console.error(
    'Please ensure CLIENT_ID and CLIENT_SECRET are set in your .env file or environment.',
  );
  console.error('See .env.example for reference.');
  process.exit(1);
}

// Log server startup (to stderr to avoid interfering with MCP protocol on stdout)
console.error('Starting Homey MCP Server...');
console.error(`Homey API URL: ${HOMEY_API_URL}`);
console.error('Environment variables validated successfully.');

// Create MCP server instance
const server = new McpServer({
  name: 'homey-server',
  version: '1.0.0',
});

/**
 * Mock Homey API client
 * In a production implementation, this would use the actual Homey API
 * with OAuth authentication flow using CLIENT_ID and CLIENT_SECRET
 */
class HomeyApiClient {
  constructor(clientId, clientSecret, apiUrl) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiUrl = apiUrl;
    this.accessToken = null;
  }

  /**
   * Authenticate with Homey API
   * This is a placeholder - actual implementation would use OAuth 2.0 flow
   */
  async authenticate() {
    console.error('Authenticating with Homey API...');
    // In a real implementation, this would:
    // 1. Use OAuth 2.0 authorization code flow
    // 2. Exchange CLIENT_ID and CLIENT_SECRET for access token
    // 3. Store and refresh tokens as needed
    this.accessToken = 'MOCK_TOKEN_REPLACE_IN_PRODUCTION';
    console.error('Authentication successful (mock)');
  }

  /**
   * List all devices from Homey
   */
  async listDevices() {
    if (!this.accessToken) {
      await this.authenticate();
    }

    console.error('Fetching devices from Homey...');

    // Mock implementation - in production, this would call:
    // GET https://api.athom.com/user/{userId}/homey/{homeyId}/device
    return [
      {
        id: 'device-1',
        name: 'Living Room Light',
        class: 'light',
        capabilities: ['onoff', 'dim'],
        capabilitiesObj: {
          onoff: { value: true },
          dim: { value: 0.75 },
        },
        zone: 'Living Room',
      },
      {
        id: 'device-2',
        name: 'Bedroom Thermostat',
        class: 'thermostat',
        capabilities: ['target_temperature', 'measure_temperature'],
        capabilitiesObj: {
          target_temperature: { value: 21 },
          measure_temperature: { value: 20.5 },
        },
        zone: 'Bedroom',
      },
      {
        id: 'device-3',
        name: 'Front Door Lock',
        class: 'lock',
        capabilities: ['locked'],
        capabilitiesObj: {
          locked: { value: true },
        },
        zone: 'Hallway',
      },
    ];
  }

  /**
   * Toggle a device's onoff capability
   */
  async toggleDevice(deviceId) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    console.error(`Toggling device: ${deviceId}`);

    // Mock implementation - in production, this would call:
    // PUT https://api.athom.com/user/{userId}/homey/{homeyId}/device/{deviceId}/capability/onoff
    const devices = await this.listDevices();
    const device = devices.find((d) => d.id === deviceId);

    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    if (!device.capabilities.includes('onoff')) {
      throw new Error(`Device ${deviceId} does not support onoff capability`);
    }

    const currentState = device.capabilitiesObj.onoff.value;
    const newState = !currentState;

    console.error(
      `Device ${deviceId} toggled from ${currentState} to ${newState}`,
    );

    return {
      deviceId,
      deviceName: device.name,
      previousState: currentState,
      newState,
    };
  }

  /**
   * List all flows from Homey
   */
  async listFlows() {
    if (!this.accessToken) {
      await this.authenticate();
    }

    console.error('Fetching flows from Homey...');

    // Mock implementation - in production, this would call:
    // GET https://api.athom.com/user/{userId}/homey/{homeyId}/flow
    return [
      {
        id: 'flow-1',
        name: 'Good Morning',
        enabled: true,
        trigger: 'When time is 07:00',
        actions: ['Turn on lights', 'Set thermostat to 21°C'],
      },
      {
        id: 'flow-2',
        name: 'Good Night',
        enabled: true,
        trigger: 'When time is 23:00',
        actions: ['Turn off all lights', 'Lock doors'],
      },
      {
        id: 'flow-3',
        name: 'Away Mode',
        enabled: false,
        trigger: 'When last person leaves',
        actions: ['Turn off all devices', 'Lock all doors', 'Set alarm'],
      },
    ];
  }
}

// Initialize Homey API client
const homeyClient = new HomeyApiClient(CLIENT_ID, CLIENT_SECRET, HOMEY_API_URL);

// Register tool: list_devices
server.registerTool(
  'list_devices',
  {
    description:
      'Lists all devices available in your Homey smart home system. Returns device information including name, type, capabilities, current state, and zone location.',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const devices = await homeyClient.listDevices();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ devices }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error listing devices:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
);

// Register tool: toggle_device
server.registerTool(
  'toggle_device',
  {
    description:
      'Toggles the on/off state of a Homey device. Only works with devices that have an onoff capability (lights, switches, etc.). Provide the device ID to toggle its current state.',
    inputSchema: z.object({
      deviceId: z
        .string()
        .describe('The unique identifier of the device to toggle'),
    }),
  },
  async ({ deviceId }) => {
    try {
      const result = await homeyClient.toggleDevice(deviceId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error toggling device:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
);

// Register tool: list_flows
server.registerTool(
  'list_flows',
  {
    description:
      'Lists all automation flows configured in your Homey system. Returns flow information including name, enabled status, trigger conditions, and actions.',
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const flows = await homeyClient.listFlows();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ flows }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error listing flows:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
);

// Connect to stdio transport and start the server
console.error('Connecting to stdio transport...');
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Homey MCP Server is running and ready to accept requests.');
