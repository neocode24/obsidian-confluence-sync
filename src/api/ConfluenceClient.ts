import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Notice } from 'obsidian';

export interface OAuthToken {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

export interface TenantConfig {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
}

export class MCPConnectionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MCPConnectionError';
	}
}

export class OAuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OAuthError';
	}
}

export class ConfluenceClient {
	private mcpClient: Client | null = null;
	private currentTenant: TenantConfig | null = null;

	/**
	 * Initialize MCP client connection for a specific tenant
	 */
	async initialize(tenantConfig: TenantConfig): Promise<void> {
		try {
			const transport = new StdioClientTransport({
				command: 'npx',
				args: ['-y', '@modelcontextprotocol/server-atlassian'],
				env: {
					ATLASSIAN_INSTANCE_URL: tenantConfig.url
				}
			});

			this.mcpClient = new Client({
				name: 'confluence-sync-client',
				version: '0.1.0'
			}, {
				capabilities: {}
			});

			await this.mcpClient.connect(transport);
			this.currentTenant = tenantConfig;

			console.log(`MCP Client connected to ${tenantConfig.url}`);
		} catch (error) {
			console.error('Failed to initialize MCP client:', error);
			throw new MCPConnectionError(
				`MCP Server 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Initiate OAuth flow - opens browser for user authentication
	 */
	async initiateOAuth(): Promise<void> {
		if (!this.mcpClient) {
			throw new MCPConnectionError('MCP Client가 초기화되지 않았습니다.');
		}

		try {
			// MCP SDK handles OAuth flow automatically
			// The server will open browser for user to authenticate
			const result = await this.mcpClient.request({
				method: 'tools/call',
				params: {
					name: 'confluence_auth_start',
					arguments: {}
				}
			}, {} as any);

			console.log('OAuth flow initiated:', result);
			new Notice('✅ Confluence 인증 성공!');
		} catch (error) {
			console.error('OAuth flow failed:', error);
			throw new OAuthError(
				`OAuth 인증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Check if client is connected and authenticated
	 */
	isConnected(): boolean {
		return this.mcpClient !== null && this.currentTenant !== null;
	}

	/**
	 * Get current tenant configuration
	 */
	getCurrentTenant(): TenantConfig | null {
		return this.currentTenant;
	}

	/**
	 * Disconnect MCP client
	 */
	async disconnect(): Promise<void> {
		if (this.mcpClient) {
			await this.mcpClient.close();
			this.mcpClient = null;
			this.currentTenant = null;
		}
	}
}
