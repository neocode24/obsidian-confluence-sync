import { Notice, requestUrl } from 'obsidian';
import * as http from 'http';
import * as crypto from 'crypto';

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

	constructor(oauthConfig: OAuthConfig) {
		this.oauthConfig = oauthConfig;
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
	 * Get access token (refresh if needed)
	 */
	async getAccessToken(): Promise<string> {
		if (!this.currentTenant?.oauthToken) {
			throw new OAuthError('Not authenticated');
		}

		// Check if token is expired
		if (this.currentTenant.oauthToken.expiresAt <= Date.now()) {
			await this.refreshAccessToken();
		}

		return this.currentTenant.oauthToken.accessToken;
	}

	/**
	 * Refresh access token using refresh token
	 */
	private async refreshAccessToken(): Promise<void> {
		if (!this.currentTenant?.oauthToken?.refreshToken) {
			throw new OAuthError('No refresh token available');
		}

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

		this.currentTenant.oauthToken = {
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token || this.currentTenant.oauthToken.refreshToken,
			expiresAt: Date.now() + (tokens.expires_in * 1000)
		};

		console.log('Access token refreshed successfully');
	}

	/**
	 * Disconnect and clear state
	 */
	async disconnect(): Promise<void> {
		this.stopCallbackServer();
		this.currentTenant = null;
	}
}
