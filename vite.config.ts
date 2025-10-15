import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';


export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return {
      // Use relative paths so the app works under a subpath on GitHub Pages
      base: '',
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            login: path.resolve(__dirname, 'login.html'),
          }
        }
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [],
      define: {
        // expose only needed variables; use Vite's VITE_ prefix convention
        'import.meta.env.VITE_LOGIN_PBKDF2_ITERATIONS': JSON.stringify(env.VITE_LOGIN_PBKDF2_ITERATIONS),
        'import.meta.env.VITE_LOGIN_USER_SALT': JSON.stringify(env.VITE_LOGIN_USER_SALT),
        'import.meta.env.VITE_LOGIN_USER_DK': JSON.stringify(env.VITE_LOGIN_USER_DK),
        'import.meta.env.VITE_LOGIN_PASS_SALT': JSON.stringify(env.VITE_LOGIN_PASS_SALT),
        'import.meta.env.VITE_LOGIN_PASS_DK': JSON.stringify(env.VITE_LOGIN_PASS_DK),
        'process.env.API_KEY': JSON.stringify(env.VITE_GROQ_API_KEY || env.GROQ_API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
