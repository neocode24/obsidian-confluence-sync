import { App, Plugin, PluginManifest, Notice } from 'obsidian';
import { ConfluenceSettingsTab } from './src/ui/settings/SettingsTab';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';

export default class ConfluenceSyncPlugin extends Plugin {
	settings: PluginSettings;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}

	async onload() {
		console.log('Loading Confluence Sync plugin');

		// Load settings
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new ConfluenceSettingsTab(this.app, this));

		// Add command to test plugin is working
		this.addCommand({
			id: 'test-confluence-sync',
			name: 'Test Confluence Sync',
			callback: () => {
				new Notice('Confluence Sync plugin is working! 🎉');
			}
		});

		new Notice('Confluence Sync plugin loaded successfully!');
	}

	onunload() {
		console.log('Unloading Confluence Sync plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
