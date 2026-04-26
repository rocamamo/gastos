import path from 'path';
import { defineConfig, devices } from '@playwright/test';

/** Binarios dentro del repo (gitignored vía node_modules) para CI y entornos sin caché global. */
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(__dirname, 'node_modules', '.cache', 'playwright');
}

const PORT = 3003;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * El middleware de Supabase exige `NEXT_PUBLIC_*` al arrancar.
 * En CI o sin `.env`, usamos el par típico de Supabase local para que `next dev` arranque;
 * las pruebas actuales no requieren una instancia real (solo 401 / docs / tipo de respuesta).
 */
const webServerEnv = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
};

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'npm run dev',
        url: `${baseURL}/login`,
        timeout: 150_000,
        /** Si ya hay `next dev` en :3003 se reutiliza; si no, Playwright arranca uno (mismo lock `.next`). */
        reuseExistingServer: true,
        env: webServerEnv,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
