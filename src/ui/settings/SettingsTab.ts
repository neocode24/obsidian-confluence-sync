import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ConfluenceSyncPlugin from '../../../main';
import { ConfluenceClient, TenantConfig } from '../../api/ConfluenceClient';
import { MCPConnectionError, OAuthError } from '../../types/errors';

export class ConfluenceSettingsTab extends PluginSettingTab {
	plugin: ConfluenceSyncPlugin;
	private confluenceClient: ConfluenceClient | null = null;

	constructor(app: App, plugin: ConfluenceSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private initializeClient(): void {
		if (!this.plugin.settings.oauthConfig?.clientId || !this.plugin.settings.oauthConfig?.clientSecret) {
			return;
		}
		this.confluenceClient = new ConfluenceClient(this.plugin.settings.oauthConfig);

		// Set token refresh callback to save updated tokens
		this.confluenceClient.setTokenRefreshCallback(async (updatedTenant) => {
			this.plugin.settings.tenants[0] = updatedTenant;
			await this.plugin.saveSettings();
			console.log('[SettingsTab] Token refreshed and saved to settings');
		});
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Confluence Sync 설정' });

		// Initialize client if we have saved credentials
		if (!this.confluenceClient && this.plugin.settings.oauthConfig?.clientId && this.plugin.settings.oauthConfig?.clientSecret) {
			this.initializeClient();
		}

		// Restore tenant state if we have a saved authenticated tenant
		if (this.confluenceClient && this.plugin.settings.tenants.length > 0) {
			const savedTenant = this.plugin.settings.tenants[0];
			if (savedTenant.oauthToken) {
				// Directly restore tenant without calling initialize()
				// to preserve the OAuth token
				this.confluenceClient.restoreTenant(savedTenant);
			}
		}

		// OAuth Configuration Section
		this.displayOAuthSection(containerEl);

		// Tenant Configuration Section
		this.displayTenantSection(containerEl);

		// Sync Filters Section
		this.displayFiltersSection(containerEl);

		// Connection Status
		this.displayConnectionStatus(containerEl);
	}

	private displayOAuthSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'OAuth 설정' });
		containerEl.createEl('p', {
			text: 'Atlassian Developer Console에서 OAuth 앱을 등록하고 credentials를 입력하세요.',
			cls: 'setting-item-description'
		});

		// Client ID
		new Setting(containerEl)
			.setName('Client ID')
			.setDesc('OAuth 앱의 Client ID (Atlassian Developer Console에서 발급)')
			.addText(text => text
				.setPlaceholder('예: JxHnedI71sZewJI9KjZc8ayU3YYU4aPH')
				.setValue(this.plugin.settings.oauthConfig?.clientId || '')
				.onChange(async (value) => {
					if (!this.plugin.settings.oauthConfig) {
						this.plugin.settings.oauthConfig = {
							clientId: value,
							clientSecret: '',
							redirectUri: 'http://localhost:8080/callback',
							scope: 'read:confluence-content.all write:confluence-content read:confluence-space.summary offline_access'
						};
					} else {
						this.plugin.settings.oauthConfig.clientId = value;
					}
					await this.plugin.saveSettings();
					this.initializeClient();
				})
			);

		// Client Secret
		new Setting(containerEl)
			.setName('Client Secret')
			.setDesc('OAuth 앱의 Client Secret (안전하게 저장됩니다)')
			.addText(text => {
				text.inputEl.type = 'password';
				return text
					.setPlaceholder('ATOAtF9WM-zMC...')
					.setValue(this.plugin.settings.oauthConfig?.clientSecret || '')
					.onChange(async (value) => {
						if (!this.plugin.settings.oauthConfig) {
							this.plugin.settings.oauthConfig = {
								clientId: '',
								clientSecret: value,
								redirectUri: 'http://localhost:8080/callback',
								scope: 'read:confluence-content.all write:confluence-content read:confluence-space.summary offline_access'
							};
						} else {
							this.plugin.settings.oauthConfig.clientSecret = value;
						}
						await this.plugin.saveSettings();
						this.initializeClient();
					});
			});

		// Advanced Settings
		containerEl.createEl('details', {}, (details) => {
			details.createEl('summary', { text: '고급 설정' });

			// Redirect URI
			new Setting(details)
				.setName('Redirect URI')
				.setDesc('OAuth callback을 받을 URI (기본값 사용 권장)')
				.addText(text => text
					.setPlaceholder('http://localhost:8080/callback')
					.setValue(this.plugin.settings.oauthConfig?.redirectUri || 'http://localhost:8080/callback')
					.onChange(async (value) => {
						if (this.plugin.settings.oauthConfig) {
							this.plugin.settings.oauthConfig.redirectUri = value;
							await this.plugin.saveSettings();
							this.initializeClient();
						}
					})
				);

			// OAuth Scope
			new Setting(details)
				.setName('OAuth Scope')
				.setDesc('OAuth 권한 범위 (기본값: Confluence read/write)')
				.addTextArea(text => text
					.setPlaceholder('read:confluence-content.all write:confluence-content ...')
					.setValue(this.plugin.settings.oauthConfig?.scope || 'read:confluence-content.all write:confluence-content read:confluence-space.summary offline_access')
					.onChange(async (value) => {
						if (this.plugin.settings.oauthConfig) {
							this.plugin.settings.oauthConfig.scope = value;
							await this.plugin.saveSettings();
							this.initializeClient();
						}
					})
				);
		});
	}

	private displayTenantSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Confluence 연결' });

		// Sync Path Setting
		new Setting(containerEl)
			.setName('동기화 경로')
			.setDesc('Confluence 페이지를 저장할 Vault 내 폴더 경로 (기본값: confluence/)')
			.addText(text => text
				.setPlaceholder('confluence/')
				.setValue(this.plugin.settings.syncPath)
				.onChange(async (value) => {
					// 경로 정규화 (끝에 / 추가)
					let normalizedPath = value.trim();
					if (normalizedPath && !normalizedPath.endsWith('/')) {
						normalizedPath += '/';
					}
					this.plugin.settings.syncPath = normalizedPath || 'confluence/';
					await this.plugin.saveSettings();
				})
			);

		// Force Full Sync Option
		new Setting(containerEl)
			.setName('강제 전체 동기화')
			.setDesc('활성화 시 모든 페이지를 다시 동기화 (변경 여부 무시)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.forceFullSync)
				.onChange(async (value) => {
					this.plugin.settings.forceFullSync = value;
					await this.plugin.saveSettings();
				})
			);

		// Tenant URL Input
		new Setting(containerEl)
			.setName('Confluence URL')
			.setDesc('Confluence 인스턴스 URL (예: https://yourcompany.atlassian.net)')
			.addText(text => text
				.setPlaceholder('https://yourcompany.atlassian.net')
				.setValue(this.plugin.settings.tenants[0]?.url || '')
				.onChange(async (value) => {
					// Update or create first tenant
					if (this.plugin.settings.tenants.length === 0) {
						this.plugin.settings.tenants.push({
							id: this.generateTenantId(),
							name: 'Default Tenant',
							url: value,
							enabled: true
						});
					} else {
						this.plugin.settings.tenants[0].url = value;
					}
					await this.plugin.saveSettings();
				})
			);

		// Connect Button
		new Setting(containerEl)
			.setName('Confluence 연결')
			.setDesc('OAuth 인증을 시작합니다 (브라우저가 열립니다)')
			.addButton(button => button
				.setButtonText('연결')
				.setCta()
				.onClick(async () => {
					await this.handleConnect();
				})
			);
	}

	private displayFiltersSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: '동기화 필터' });
		containerEl.createEl('p', {
			text: '특정 Space, Label 또는 페이지만 동기화하도록 필터를 설정할 수 있습니다.',
			cls: 'setting-item-description'
		});

		// Ensure filters object exists
		if (!this.plugin.settings.filters) {
			this.plugin.settings.filters = {
				enabled: false,
				spaceKeys: [],
				labels: [],
				rootPageIds: []
			};
		}

		// Enable Filters Toggle
		new Setting(containerEl)
			.setName('필터 활성화')
			.setDesc('동기화 필터를 사용합니다')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.filters?.enabled || false)
				.onChange(async (value) => {
					if (this.plugin.settings.filters) {
						this.plugin.settings.filters.enabled = value;
						await this.plugin.saveSettings();
						this.display(); // Refresh to show/hide filter options
					}
				})
			);

		// Show filter options only if enabled
		if (this.plugin.settings.filters.enabled) {
			// Space Filter
			new Setting(containerEl)
				.setName('Space 필터')
				.setDesc('동기화할 Space 키 목록 (쉼표로 구분, 예: SPACE1, SPACE2)')
				.addText(text => text
					.setPlaceholder('SPACE1, SPACE2')
					.setValue(this.plugin.settings.filters?.spaceKeys.join(', ') || '')
					.onChange(async (value) => {
						if (this.plugin.settings.filters) {
							this.plugin.settings.filters.spaceKeys = value
								.split(',')
								.map(s => s.trim())
								.filter(s => s.length > 0);
							await this.plugin.saveSettings();
						}
					})
				);

			// Label Filter
			new Setting(containerEl)
				.setName('Label 필터')
				.setDesc('동기화할 레이블 목록 (쉼표로 구분, 예: important, documentation)')
				.addText(text => text
					.setPlaceholder('important, documentation')
					.setValue(this.plugin.settings.filters?.labels.join(', ') || '')
					.onChange(async (value) => {
						if (this.plugin.settings.filters) {
							this.plugin.settings.filters.labels = value
								.split(',')
								.map(s => s.trim())
								.filter(s => s.length > 0);
							await this.plugin.saveSettings();
						}
					})
				);

			// Page Tree Filter
			new Setting(containerEl)
				.setName('페이지 트리 필터')
				.setDesc('루트 페이지 ID 목록 (쉼표로 구분) - 지정된 페이지와 하위 페이지만 동기화')
				.addText(text => text
					.setPlaceholder('123456789, 987654321')
					.setValue(this.plugin.settings.filters?.rootPageIds.join(', ') || '')
					.onChange(async (value) => {
						if (this.plugin.settings.filters) {
							this.plugin.settings.filters.rootPageIds = value
								.split(',')
								.map(s => s.trim())
								.filter(s => s.length > 0);
							await this.plugin.saveSettings();
						}
					})
				);

			// Info message
			containerEl.createEl('p', {
				text: 'ℹ️ 필터가 비어있으면 해당 조건은 적용되지 않습니다 (모든 항목 포함)',
				cls: 'setting-item-description'
			});
		}
	}

	private displayConnectionStatus(containerEl: HTMLElement): void {
		const statusContainer = containerEl.createDiv('confluence-connection-status');

		const isConnected = this.confluenceClient?.isConnected() || false;
		const tenant = this.confluenceClient?.getCurrentTenant();

		if (isConnected && tenant) {
			statusContainer.createEl('p', {
				text: `✅ 연결됨: ${tenant.url}`,
				cls: 'confluence-status-connected'
			});
		} else {
			statusContainer.createEl('p', {
				text: '❌ 연결 안 됨',
				cls: 'confluence-status-disconnected'
			});
		}
	}

	private async handleConnect(): Promise<void> {
		// Check OAuth config
		if (!this.plugin.settings.oauthConfig?.clientId || !this.plugin.settings.oauthConfig?.clientSecret) {
			new Notice('⚠️ OAuth Client ID와 Client Secret을 먼저 입력해주세요.');
			return;
		}

		const tenants = this.plugin.settings.tenants;

		if (tenants.length === 0 || !tenants[0].url) {
			new Notice('⚠️ Confluence URL을 먼저 입력해주세요.');
			return;
		}

		const tenant = tenants[0];

		try {
			// Initialize client if not already done
			if (!this.confluenceClient) {
				this.initializeClient();
			}

			if (!this.confluenceClient) {
				throw new Error('Failed to initialize Confluence client');
			}

			new Notice('🔄 Confluence 연결 중...');

			// Initialize client with tenant config
			await this.confluenceClient.initialize(tenant);

			new Notice('🔄 OAuth 인증 시작 중...');

			// Initiate OAuth flow
			await this.confluenceClient.initiateOAuth();

			// Save updated tenant with OAuth token to plugin settings
			const updatedTenant = this.confluenceClient.getCurrentTenant();
			if (updatedTenant) {
				this.plugin.settings.tenants[0] = updatedTenant;
				await this.plugin.saveSettings();
			}

			// Update plugin's confluenceClient reference
			this.plugin.confluenceClient = this.confluenceClient;
			console.log('[SettingsTab] Updated plugin confluenceClient reference');

			// Refresh status display
			this.display();

		} catch (error) {
			if (error instanceof MCPConnectionError) {
				new Notice(`❌ MCP Server 연결 실패\n\n${error.message}\n\nMCP Server가 실행 중인지 확인하세요.`, 10000);
			} else if (error instanceof OAuthError) {
				new Notice(`❌ OAuth 인증 실패\n\n${error.message}\n\n다시 시도해주세요.`, 10000);
			} else {
				new Notice(`❌ 연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`, 10000);
			}
			console.error('Connection error:', error);
		}
	}

	private generateTenantId(): string {
		return `tenant-${Date.now()}`;
	}
}
