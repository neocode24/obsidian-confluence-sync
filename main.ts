import { App, Plugin, PluginManifest, Notice } from 'obsidian';

export default class ConfluenceSyncPlugin extends Plugin {
	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}

	async onload() {
		console.log('Loading Confluence Sync plugin');

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
}
