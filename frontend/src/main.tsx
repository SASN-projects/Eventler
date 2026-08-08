import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import './index.css'
import App from './App.tsx'
import { eventlerTheme } from './theme.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={eventlerTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
