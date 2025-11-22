import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ConfluenceSyncPlugin from '../../../main';
import { ConfluenceClient, TenantConfig, MCPConnectionError, OAuthError } from '../../api/ConfluenceClient';

export class ConfluenceSettingsTab extends PluginSettingTab {
	plugin: ConfluenceSyncPlugin;
	private confluenceClient: ConfluenceClient;

	constructor(app: App, plugin: ConfluenceSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.confluenceClient = new ConfluenceClient();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Confluence Sync 설정' });

		// Tenant Configuration Section
		this.displayTenantSection(containerEl);

		// Connection Status
		this.displayConnectionStatus(containerEl);
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

		const isConnected = this.confluenceClient.isConnected();
		const tenant = this.confluenceClient.getCurrentTenant();

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
		const tenants = this.plugin.settings.tenants;

		if (tenants.length === 0 || !tenants[0].url) {
			new Notice('⚠️ Confluence URL을 먼저 입력해주세요.');
			return;
		}

		const tenant = tenants[0];

		try {
			new Notice('🔄 MCP Server 연결 중...');

			// Initialize MCP client
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
