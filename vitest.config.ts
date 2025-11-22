import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: ['src/types/**', 'src/**/*.d.ts']
		}
	},
	resolve: {
		alias: {
			'obsidian': new URL('./test/mocks/obsidian.ts', import.meta.url).pathname
		}
	}
});
