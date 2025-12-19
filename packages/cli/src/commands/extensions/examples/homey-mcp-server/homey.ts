/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'homey-server',
  version: '1.0.0',
});

// Homey API configuration from environment variables
const HOMEY_CLIENT_ID = process.env.HOMEY_CLIENT_ID || '';
const HOMEY_CLIENT_SECRET = process.env.HOMEY_CLIENT_SECRET || '';
const HOMEY_API_URL = process.env.HOMEY_API_URL || 'https://api.athom.com';

interface HomeyDevice {
  id: string;
  name: string;
  zone?: { name: string };
  class?: string;
  capabilities?: string[];
  capabilitiesObj?: Record<
    string,
    { value: boolean | number | string; type?: string }
  >;
}

interface HomeyDeviceListResponse {
  result: HomeyDevice[];
}

/**
 * Helper function to get OAuth token for Homey API
 *
 * NOTE: This is a simplified implementation for demonstration purposes.
 * In a production environment, you should implement proper OAuth 2.0 flow:
 * 1. Use the client ID and secret to obtain an OAuth token from Homey's auth endpoint
 * 2. Store and refresh tokens as needed
 * 3. Never use the client secret directly as a bearer token
 *
 * For production use, consider using a library like `oauth` or `simple-oauth2`
 * to handle the OAuth flow properly.
 */
async function getHomeyToken(): Promise<string> {
  if (!HOMEY_CLIENT_ID || !HOMEY_CLIENT_SECRET) {
    throw new Error(
      'HOMEY_CLIENT_ID and HOMEY_CLIENT_SECRET environment variables must be set',
    );
  }

  // SIMPLIFIED APPROACH - NOT FOR PRODUCTION
  // In a real implementation, this would:
  // 1. Make a POST request to Homey's OAuth token endpoint
  // 2. Include client_id, client_secret, and grant_type=client_credentials
  // 3. Extract and return the access_token from the response
  // 4. Implement token caching and refresh logic
  return HOMEY_CLIENT_SECRET;
}

/**
 * Helper function to make authenticated requests to Homey API
 */
async function homeyApiRequest<T>(
  endpoint: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const token = await getHomeyToken();

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${HOMEY_API_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Homey API request failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return (await response.json()) as T;
}

// Register the "list_devices" tool
server.registerTool(
  'list_devices',
  {
    description:
      'Lists all devices connected to your Homey smart home system. Returns device ID, name, zone, class, and capabilities.',
    inputSchema: z.object({}).shape,
  },
  async () => {
    try {
      const data =
        await homeyApiRequest<HomeyDeviceListResponse>('/api/devices');

      const devices = data.result.map((device) => ({
        id: device.id,
        name: device.name,
        zone: device.zone?.name || 'Unknown',
        class: device.class || 'Unknown',
        capabilities: device.capabilities || [],
        state: device.capabilitiesObj || {},
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ devices, count: devices.length }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to list Homey devices',
              details: errorMessage,
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

// Register the "toggle_device" tool
server.registerTool(
  'toggle_device',
  {
    description:
      'Toggles a Homey device on or off. Requires the device ID which can be obtained from list_devices.',
    inputSchema: z.object({
      deviceId: z.string().describe('The unique ID of the device to toggle'),
      capability: z
        .string()
        .optional()
        .describe(
          'The capability to toggle (e.g., "onoff"). Defaults to "onoff"',
        ),
      value: z
        .union([z.boolean(), z.number(), z.string()])
        .optional()
        .describe(
          'The value to set. For onoff capability, use true/false. If not provided, will toggle the current state.',
        ),
    }).shape,
  },
  async ({ deviceId, capability = 'onoff', value }) => {
    try {
      if (!deviceId) {
        throw new Error('deviceId is required');
      }

      // If no value is provided, we need to get the current state first
      let targetValue = value;
      if (targetValue === undefined) {
        const deviceData = await homeyApiRequest<{ result: HomeyDevice }>(
          `/api/devices/${deviceId}`,
        );
        const currentValue =
          deviceData.result.capabilitiesObj?.[capability]?.value;

        if (typeof currentValue === 'boolean') {
          targetValue = !currentValue;
        } else {
          throw new Error(
            `Cannot toggle capability "${capability}" - current value is not boolean`,
          );
        }
      }

      // Set the capability value
      await homeyApiRequest(
        `/api/devices/${deviceId}/capabilities/${capability}`,
        'PUT',
        { value: targetValue },
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              deviceId,
              capability,
              value: targetValue,
              message: `Successfully set ${capability} to ${targetValue}`,
            }),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to toggle Homey device',
              details: errorMessage,
              deviceId,
            }),
          },
        ],
        isError: true,
      };
    }
  },
);

// Register a prompt for quick device control
server.registerPrompt(
  'control-device',
  {
    title: 'Control Homey Device',
    description: 'Quick prompt to control a Homey device by name',
    argsSchema: {
      deviceName: z.string(),
      action: z.enum(['on', 'off', 'toggle']).optional(),
    },
  },
  ({ deviceName, action = 'toggle' }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please ${action} the Homey device named "${deviceName}". First list all devices to find the correct device ID, then perform the action.`,
        },
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
