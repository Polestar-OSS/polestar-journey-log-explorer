import { defineConfig } from 'vitest/config';

/**
 * Unit tests live at the repository root under /tests (BusinessRepo layout)
 * and import the application services relatively. They run in Node: the
 * services under test are pure and have no DOM dependency.
 */
export default defineConfig({
    test: {
        include: ['../tests/unit/**/*.test.js'],
        environment: 'node',
        globals: false,
        coverage: {
            provider: 'v8',
            include: ['src/services/**', 'src/utils/**'],
            reporter: ['text', 'lcov'],
        },
    },
});
