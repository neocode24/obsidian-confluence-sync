import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ConfluenceSyncPlugin from '../../../main';
import { ConfluenceClient, TenantConfig, MCPConnectionError, OAuthError } from '../../api/ConfluenceClient';

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
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Confluence Sync 설정' });

		// OAuth Configuration Section
		this.displayOAuthSection(containerEl);

		// Tenant Configuration Section
		this.displayTenantSection(containerEl);

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
			.setDesc('OAuth 앱의 Client ID')
			.addText(text => text
				.setPlaceholder('Client ID 입력')
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
					.setPlaceholder('Client Secret 입력')
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
	}

	private displayTenantSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Confluence 연결' });

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
