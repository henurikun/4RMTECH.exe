import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { CartProvider } from './context/CartContext.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { CatalogProvider } from './context/CatalogContext.tsx'
import { initFirebaseAnalytics } from './firebase'

void initFirebaseAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CatalogProvider>
        <CartProvider>
          <App />
          <Toaster richColors position="top-center" theme="dark" />
        </CartProvider>
      </CatalogProvider>
    </AuthProvider>
  </StrictMode>,
)
