import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'build',
      sourcemap: true
    },
    // Expose REACT_APP_ prefixed env variables to the client
    define: {
      'import.meta.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL),
      'import.meta.env.REACT_APP_USER_POOL_ID': JSON.stringify(env.REACT_APP_USER_POOL_ID),
      'import.meta.env.REACT_APP_USER_POOL_CLIENT_ID': JSON.stringify(env.REACT_APP_USER_POOL_CLIENT_ID),
      'import.meta.env.REACT_APP_REGION': JSON.stringify(env.REACT_APP_REGION),
      'import.meta.env.REACT_APP_ENV': JSON.stringify(env.REACT_APP_ENV),
    }
  }
})
