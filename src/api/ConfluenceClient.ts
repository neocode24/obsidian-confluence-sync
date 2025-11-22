import { Notice, requestUrl } from 'obsidian';
import * as http from 'http';
import * as crypto from 'crypto';
import { ConfluencePage, PageSearchResult } from '../types/confluence';
import {
	MCPConnectionError,
	OAuthError,
	NetworkError,
	ConfluenceAPIError,
	PermissionError
} from '../types/errors';

export interface OAuthToken {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
}

export interface TenantConfig {
	id: string;
	name: string;
	url: string;
	enabled: boolean;
	cloudId?: string;
	oauthToken?: OAuthToken;
}

/**
 * Atlassian OAuth 2.0 Configuration
 * Client credentials should be configured in plugin settings
 */
export interface OAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	scope: string;
}

const DEFAULT_OAUTH_CONFIG = {
	redirectUri: 'http://localhost:8080/callback',
	scope: 'read:confluence-content.all write:confluence-content read:confluence-space.summary offline_access',
	authorizationUrl: 'https://auth.atlassian.com/authorize',
	tokenUrl: 'https://auth.atlassian.com/oauth/token',
	resourcesUrl: 'https://api.atlassian.com/oauth/token/accessible-resources'
};

export class ConfluenceClient {
	private currentTenant: TenantConfig | null = null;
	private localServer: http.Server | null = null;
	private oauthConfig: OAuthConfig;
	private onTokenRefreshed?: (tenant: TenantConfig) => Promise<void>;

	constructor(oauthConfig: OAuthConfig) {
		this.oauthConfig = oauthConfig;
	}

	/**
	 * Set callback to be called when token is refreshed
	 */
	setTokenRefreshCallback(callback: (tenant: TenantConfig) => Promise<void>): void {
		this.onTokenRefreshed = callback;
	}

	/**
	 * Initialize Confluence client
	 */
	async initialize(tenantConfig: TenantConfig): Promise<void> {
		this.currentTenant = tenantConfig;
		console.log(`Confluence client initialized for ${tenantConfig.url}`);
	}

	/**
	 * Initiate OAuth 2.0 authorization flow
	 */
	async initiateOAuth(): Promise<void> {
		if (!this.currentTenant) {
			throw new MCPConnectionError('Tenant가 초기화되지 않았습니다.');
		}

		try {
			const state = crypto.randomBytes(16).toString('hex');

			// Build authorization URL
			const authUrl = new URL(DEFAULT_OAUTH_CONFIG.authorizationUrl);
			authUrl.searchParams.set('audience', 'api.atlassian.com');
			authUrl.searchParams.set('client_id', this.oauthConfig.clientId);
			authUrl.searchParams.set('scope', this.oauthConfig.scope);
			authUrl.searchParams.set('redirect_uri', this.oauthConfig.redirectUri);
			authUrl.searchParams.set('state', state);
			authUrl.searchParams.set('response_type', 'code');
			authUrl.searchParams.set('prompt', 'consent');

			// Start local callback server
			await this.startCallbackServer(state);

			// Open browser for OAuth
			window.open(authUrl.toString(), '_blank');
			new Notice('브라우저에서 Confluence 인증을 진행해주세요.');
		} catch (error) {
			console.error('OAuth flow failed:', error);
			throw new OAuthError(
				`OAuth 인증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Start local HTTP server to receive OAuth callback
	 */
	private async startCallbackServer(expectedState: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.localServer = http.createServer(async (req, res) => {
				if (!req.url?.startsWith('/callback')) {
					res.writeHead(404);
					res.end('Not Found');
					return;
				}

				const url = new URL(req.url, `http://localhost:8080`);
				const code = url.searchParams.get('code');
				const state = url.searchParams.get('state');

				// Validate state
				if (state !== expectedState) {
					res.writeHead(400);
					res.end('Invalid state parameter');
					this.stopCallbackServer();
					reject(new OAuthError('State mismatch'));
					return;
				}

				if (!code) {
					res.writeHead(400);
					res.end('No authorization code received');
					this.stopCallbackServer();
					reject(new OAuthError('No authorization code'));
					return;
				}

				try {
					// Exchange code for tokens
					await this.exchangeCodeForTokens(code);

					res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
					res.end('<html><head><meta charset="utf-8"></head><body><h1>✅ 인증 성공!</h1><p>Obsidian으로 돌아가세요.</p></body></html>');

					this.stopCallbackServer();
					resolve();
				} catch (error) {
					res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
					res.end('<html><head><meta charset="utf-8"></head><body><h1>❌ 인증 실패</h1><p>에러: ' + (error instanceof Error ? error.message : 'Unknown error') + '</p></body></html>');
					this.stopCallbackServer();
					reject(error);
				}
			});

			this.localServer.listen(8080, () => {
				console.log('OAuth callback server started on port 8080');
				resolve();
			});

			this.localServer.on('error', (error) => {
				reject(new OAuthError(`Failed to start callback server: ${error.message}`));
			});
		});
	}

	/**
	 * Exchange authorization code for access/refresh tokens
	 */
	private async exchangeCodeForTokens(code: string): Promise<void> {
		const response = await requestUrl({
			url: DEFAULT_OAUTH_CONFIG.tokenUrl,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				grant_type: 'authorization_code',
				client_id: this.oauthConfig.clientId,
				client_secret: this.oauthConfig.clientSecret,
				code: code,
				redirect_uri: this.oauthConfig.redirectUri
			})
		});

		const tokens = response.json;

		// Get Cloud ID
		const cloudId = await this.getCloudId(tokens.access_token);

		if (this.currentTenant) {
			this.currentTenant.oauthToken = {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt: Date.now() + (tokens.expires_in * 1000)
			};
			this.currentTenant.cloudId = cloudId;
		}

		console.log('OAuth tokens obtained successfully');
		new Notice('✅ Confluence 인증 성공!');
	}

	/**
	 * Get Atlassian Cloud ID for the authenticated user
	 */
	private async getCloudId(accessToken: string): Promise<string> {
		const response = await requestUrl({
			url: DEFAULT_OAUTH_CONFIG.resourcesUrl,
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Accept': 'application/json'
			}
		});

		const resources = response.json;
		if (!resources || resources.length === 0) {
			throw new OAuthError('No accessible Atlassian resources found');
		}

		return resources[0].id;
	}

	/**
	 * Stop OAuth callback server
	 */
	private stopCallbackServer(): void {
		if (this.localServer) {
			this.localServer.close();
			this.localServer = null;
			console.log('OAuth callback server stopped');
		}
	}

	/**
	 * Check if client is connected and authenticated
	 */
	isConnected(): boolean {
		return this.currentTenant !== null &&
		       this.currentTenant.oauthToken !== undefined &&
		       this.currentTenant.oauthToken.expiresAt > Date.now();
	}

	/**
	 * Get current tenant configuration
	 */
	getCurrentTenant(): TenantConfig | null {
		return this.currentTenant;
	}

	/**
	 * Restore tenant state (for settings persistence)
	 */
	restoreTenant(tenant: TenantConfig): void {
		this.currentTenant = tenant;
		console.log('Tenant state restored:', tenant.url);
	}

	/**
	 * Get access token (refresh if needed)
	 */
	async getAccessToken(): Promise<string> {
		if (!this.currentTenant?.oauthToken) {
			throw new OAuthError('Not authenticated');
		}

		// Check if token is expired (with 60 second buffer)
		const now = Date.now();
		const expiresAt = this.currentTenant.oauthToken.expiresAt;
		const timeUntilExpiry = expiresAt - now;

		console.log(`[Confluence] Token check - Expires at: ${new Date(expiresAt).toISOString()}, Now: ${new Date(now).toISOString()}, Time until expiry: ${Math.floor(timeUntilExpiry / 1000)}s`);

		if (timeUntilExpiry <= 60000) { // Refresh if expires within 60 seconds
			console.log('[Confluence] Token expired or expiring soon, refreshing...');
			try {
				await this.refreshAccessToken();
			} catch (error) {
				console.error('[Confluence] Token refresh failed:', error);
				throw new OAuthError(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		return this.currentTenant.oauthToken.accessToken;
	}

	/**
	 * Refresh access token using refresh token
	 */
	private async refreshAccessToken(): Promise<void> {
		if (!this.currentTenant?.oauthToken?.refreshToken) {
			throw new OAuthError('No refresh token available. Please reconnect to Confluence.');
		}

		try {
			console.log('[Confluence] Refreshing access token...');
			const response = await requestUrl({
				url: DEFAULT_OAUTH_CONFIG.tokenUrl,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					grant_type: 'refresh_token',
					client_id: this.oauthConfig.clientId,
					client_secret: this.oauthConfig.clientSecret,
					refresh_token: this.currentTenant.oauthToken.refreshToken
				})
			});

			const tokens = response.json;

			if (!tokens.access_token) {
				throw new OAuthError('Invalid token response from server');
			}

			this.currentTenant.oauthToken = {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token || this.currentTenant.oauthToken.refreshToken,
				expiresAt: Date.now() + (tokens.expires_in * 1000)
			};

			console.log('[Confluence] Access token refreshed successfully');
			console.log(`[Confluence] New token expires at: ${new Date(this.currentTenant.oauthToken.expiresAt).toISOString()}`);

			// Call callback to save updated tenant to settings
			if (this.onTokenRefreshed && this.currentTenant) {
				await this.onTokenRefreshed(this.currentTenant);
			}
		} catch (error: any) {
			console.error('[Confluence] Token refresh failed:', error);

			// Check if it's a 400/401 error (invalid refresh token)
			if (error.status === 400 || error.status === 401) {
				throw new OAuthError('Refresh token is invalid or expired. Please reconnect to Confluence from Settings.');
			}

			throw error;
		}
	}

	/**
	 * Disconnect and clear state
	 */
	async disconnect(): Promise<void> {
		this.stopCallbackServer();
		this.currentTenant = null;
	}

	/**
	 * Search Confluence pages using CQL query
	 * @param cql CQL query string (default: creator = currentUser() AND type = page)
	 * @param limit Maximum number of results (default: 50, max: 100)
	 * @returns Array of ConfluencePage objects
	 */
	async searchPages(
		cql: string = 'creator = currentUser() AND type = page',
		limit: number = 50
	): Promise<ConfluencePage[]> {
		if (!this.currentTenant?.cloudId) {
			throw new MCPConnectionError('Tenant not initialized or cloudId missing');
		}

		if (!this.isConnected()) {
			throw new OAuthError('Not authenticated. Please connect to Confluence first.');
		}

		try {
			const accessToken = await this.getAccessToken();
			const baseUrl = `https://api.atlassian.com/ex/confluence/${this.currentTenant.cloudId}`;
			const endpoint = `${baseUrl}/wiki/api/v2/search`;

			// Build query parameters
			const params = new URLSearchParams({
				cql: cql,
				limit: Math.min(limit, 100).toString(),
				expand: 'body.storage,version,metadata.labels'
			});

			const url = `${endpoint}?${params.toString()}`;

			console.log(`[Confluence] Searching pages with CQL: ${cql}`);

			const response = await requestUrl({
				url: url,
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json'
				}
			});

			// Parse response
			const data = response.json;
			const pages = this.parseSearchResults(data);

			console.log(`[Confluence] Found ${pages.length} pages`);
			pages.forEach(page => {
				console.log(`  - ID: ${page.id}, Title: "${page.title}", Space: ${page.spaceKey}`);
			});

			return pages;

		} catch (error: any) {
			// Handle HTTP errors
			if (error.status) {
				switch (error.status) {
					case 401:
						throw new OAuthError('Authentication failed. Token may be expired.');
					case 403:
						throw new PermissionError('Permission denied. Check Confluence access permissions.');
					case 400:
						throw new ConfluenceAPIError(`Invalid CQL query: ${cql}`, 400, { cql });
					case 429:
						throw new ConfluenceAPIError('Rate limit exceeded', 429);
					default:
						throw new ConfluenceAPIError(
							`Confluence API error: ${error.message}`,
							error.status
						);
				}
			}

			// Handle network errors
			if (error.message?.includes('network') || error.message?.includes('timeout')) {
				throw new NetworkError(`Network error: ${error.message}`);
			}

			// Rethrow if already our custom error
			if (error instanceof MCPConnectionError ||
			    error instanceof OAuthError ||
			    error instanceof NetworkError ||
			    error instanceof ConfluenceAPIError ||
			    error instanceof PermissionError) {
				throw error;
			}

			// Unknown error
			throw new NetworkError(`Unexpected error: ${error.message}`);
		}
	}

	/**
	 * Parse Confluence API search results into ConfluencePage objects
	 */
	private parseSearchResults(data: any): ConfluencePage[] {
		if (!data || !data.results) {
			return [];
		}

		return data.results
			.filter((result: any) => result.content?.type === 'page')
			.map((result: any) => {
				const content = result.content;
				return {
					id: content.id,
					title: content.title,
					spaceKey: content.space?.key || 'UNKNOWN',
					content: content.body?.storage?.value || '',
					version: content.version?.number || 1,
					lastModified: content.version?.createdAt || new Date().toISOString(),
					author: content.authorId || 'unknown',
					url: content._links?.webui
						? `${this.currentTenant!.url}${content._links.webui}`
						: '',
					labels: content.metadata?.labels?.results?.map((l: any) => l.name) || [],
					parentId: content.parentId,
					attachments: []
				};
			});
	}
}
