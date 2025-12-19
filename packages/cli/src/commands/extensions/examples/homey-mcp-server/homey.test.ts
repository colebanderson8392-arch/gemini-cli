/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// Mock the MCP server and transport
const mockRegisterTool = vi.fn();
const mockRegisterPrompt = vi.fn();
const mockConnect = vi.fn();

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    registerTool: mockRegisterTool,
    registerPrompt: mockRegisterPrompt,
    connect: mockConnect,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

describe('Homey MCP Server', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Set up environment variables for tests
    process.env = {
      ...originalEnv,
      HOMEY_CLIENT_ID: 'test-client-id',
      HOMEY_CLIENT_SECRET: 'test-client-secret',
      HOMEY_API_URL: 'https://test-api.homey.com',
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('Server Initialization', () => {
    beforeEach(async () => {
      vi.resetModules();
      await import('./homey.js');
    });

    it('should create an McpServer with the correct name and version', () => {
      expect(McpServer).toHaveBeenCalledWith({
        name: 'homey-server',
        version: '1.0.0',
      });
    });

    it('should register the "list_devices" tool', () => {
      expect(mockRegisterTool).toHaveBeenCalledWith(
        'list_devices',
        {
          description: expect.stringContaining('Lists all devices'),
          inputSchema: z.object({}).shape,
        },
        expect.any(Function),
      );
    });

    it('should register the "toggle_device" tool', () => {
      expect(mockRegisterTool).toHaveBeenCalledWith(
        'toggle_device',
        expect.objectContaining({
          description: expect.stringContaining('Toggles a Homey device'),
        }),
        expect.any(Function),
      );
    });

    it('should register the "control-device" prompt', () => {
      expect(mockRegisterPrompt).toHaveBeenCalledWith(
        'control-device',
        {
          title: 'Control Homey Device',
          description: expect.stringContaining('Quick prompt to control'),
          argsSchema: expect.any(Object),
        },
        expect.any(Function),
      );
    });

    it('should connect the server to an StdioServerTransport', () => {
      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(StdioServerTransport),
      );
    });
  });

  describe('list_devices tool implementation', () => {
    let listDevicesFn: (args: unknown) => Promise<unknown>;

    beforeEach(async () => {
      vi.resetModules();
      await import('./homey.js');
      listDevicesFn = (mockRegisterTool as Mock).mock.calls.find(
        (call) => call[0] === 'list_devices',
      )[2];
    });

    it('should fetch and return a list of devices', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          name: 'Living Room Light',
          zone: { name: 'Living Room' },
          class: 'light',
          capabilities: ['onoff', 'dim'],
          capabilitiesObj: {
            onoff: { value: true, type: 'boolean' },
            dim: { value: 0.5, type: 'number' },
          },
        },
        {
          id: 'device-2',
          name: 'Bedroom Thermostat',
          zone: { name: 'Bedroom' },
          class: 'thermostat',
          capabilities: ['target_temperature'],
          capabilitiesObj: {
            target_temperature: { value: 21, type: 'number' },
          },
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ result: mockDevices }),
      });

      const result = await listDevicesFn({});

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.homey.com/api/devices',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-client-secret',
          }),
        }),
      );

      expect(result).toHaveProperty('content');
      const content = (result as { content: { type: string; text: string }[] })
        .content;
      expect(content).toHaveLength(1);
      expect(content[0].type).toBe('text');

      const responseData = JSON.parse(content[0].text);
      expect(responseData.devices).toHaveLength(2);
      expect(responseData.count).toBe(2);
      expect(responseData.devices[0].name).toBe('Living Room Light');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid credentials'),
      });

      const result = await listDevicesFn({});

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', true);

      const content = (result as { content: { type: string; text: string }[] })
        .content;
      const responseData = JSON.parse(content[0].text);
      expect(responseData).toHaveProperty('error');
      expect(responseData.details).toContain('401');
    });

    it('should handle missing environment variables', async () => {
      // Set environment variables to empty strings before importing
      process.env.HOMEY_CLIENT_ID = '';
      process.env.HOMEY_CLIENT_SECRET = '';

      // Mock fetch to return 401 error (simulating invalid/missing credentials)
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid or missing credentials'),
      });

      // Re-import to get fresh module with empty env vars
      vi.resetModules();
      await import('./homey.js');

      const freshListDevicesFn = (mockRegisterTool as Mock).mock.calls.find(
        (call) => call[0] === 'list_devices',
      )[2];

      const result = await freshListDevicesFn({});

      expect(result).toHaveProperty('isError', true);
      const content = (result as { content: { type: string; text: string }[] })
        .content;
      const responseData = JSON.parse(content[0].text);
      // When env vars are empty/missing, the API will return 401
      expect(responseData.error).toBe('Failed to list Homey devices');
      expect(responseData.details).toContain('401');
    });
  });

  describe('toggle_device tool implementation', () => {
    let toggleDeviceFn: (args: {
      deviceId?: string;
      capability?: string;
      value?: boolean | number | string;
    }) => Promise<unknown>;

    beforeEach(async () => {
      vi.resetModules();
      await import('./homey.js');
      toggleDeviceFn = (mockRegisterTool as Mock).mock.calls.find(
        (call) => call[0] === 'toggle_device',
      )[2];
    });

    it('should toggle a device with explicit value', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const result = await toggleDeviceFn({
        deviceId: 'device-1',
        capability: 'onoff',
        value: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.homey.com/api/devices/device-1/capabilities/onoff',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ value: true }),
        }),
      );

      expect(result).toHaveProperty('content');
      const content = (result as { content: { type: string; text: string }[] })
        .content;
      const responseData = JSON.parse(content[0].text);
      expect(responseData.success).toBe(true);
      expect(responseData.value).toBe(true);
    });

    it('should toggle a device by fetching current state when value is not provided', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            result: {
              id: 'device-1',
              capabilitiesObj: {
                onoff: { value: false },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({}),
        });

      const result = await toggleDeviceFn({
        deviceId: 'device-1',
        capability: 'onoff',
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        'https://test-api.homey.com/api/devices/device-1',
        expect.any(Object),
      );

      const content = (result as { content: { type: string; text: string }[] })
        .content;
      const responseData = JSON.parse(content[0].text);
      expect(responseData.value).toBe(true); // Should toggle from false to true
    });

    it('should use default capability "onoff" when not specified', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      await toggleDeviceFn({
        deviceId: 'device-1',
        value: false,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-api.homey.com/api/devices/device-1/capabilities/onoff',
        expect.any(Object),
      );
    });

    it('should handle missing deviceId', async () => {
      const result = await toggleDeviceFn({
        value: true,
      });

      expect(result).toHaveProperty('isError', true);
      const content = (result as { content: { type: string; text: string }[] })
        .content;
      const responseData = JSON.parse(content[0].text);
      expect(responseData.details).toContain('deviceId is required');
    });

    it('should handle API errors when toggling', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: vi.fn().mockResolvedValue('Device not found'),
      });

      const result = await toggleDeviceFn({
        deviceId: 'invalid-device',
        value: true,
      });

      expect(result).toHaveProperty('isError', true);
      const content = (result as { content: { type: string; text: string }[] })
        .content;
      const responseData = JSON.parse(content[0].text);
      expect(responseData.details).toContain('404');
    });
  });

  describe('control-device prompt implementation', () => {
    let promptFn: (args: {
      deviceName: string;
      action?: 'on' | 'off' | 'toggle';
    }) => { messages: unknown[] };

    beforeEach(async () => {
      vi.resetModules();
      await import('./homey.js');
      promptFn = (mockRegisterPrompt as Mock).mock.calls[0][2];
    });

    it('should generate a prompt with device name and default action', () => {
      const result = promptFn({ deviceName: 'Living Room Light' });

      expect(result).toHaveProperty('messages');
      expect(result.messages).toHaveLength(1);
      const message = result.messages[0] as {
        role: string;
        content: { type: string; text: string };
      };
      expect(message.role).toBe('user');
      expect(message.content.text).toContain('toggle');
      expect(message.content.text).toContain('Living Room Light');
    });

    it('should generate a prompt with device name and specific action', () => {
      const result = promptFn({
        deviceName: 'Bedroom Light',
        action: 'on',
      });

      const message = result.messages[0] as {
        role: string;
        content: { type: string; text: string };
      };
      expect(message.content.text).toContain('on');
      expect(message.content.text).toContain('Bedroom Light');
    });

    it('should handle "off" action', () => {
      const result = promptFn({
        deviceName: 'Kitchen Light',
        action: 'off',
      });

      const message = result.messages[0] as {
        role: string;
        content: { type: string; text: string };
      };
      expect(message.content.text).toContain('off');
      expect(message.content.text).toContain('Kitchen Light');
    });
  });
});
