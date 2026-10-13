import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopBar from './components/TopBar';
import DashboardView from './components/DashboardView';
import OrdersView from './components/OrdersView';
import SettlementsView from './components/SettlementsView';
import SummariesView from './components/SummariesView';
import NewSaleModal from './components/NewSaleModal';
import LoginView from './components/LoginView';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Si no hay usuario logueado
  if (!user) {
    return <LoginView onLoginSuccess={() => setCurrentSection('dashboard')} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50/60 font-sans text-slate-900">
      {/* 1. Barra Lateral (Desktop) */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={(sec) => {
          if (sec === 'new-sale') {
            setIsNewSaleOpen(true);
          } else {
            setCurrentSection(sec);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Área Principal de Contenido */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* TopBar */}
        <TopBar
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNewSale={() => setIsNewSaleOpen(true)}
        />

        {/* Vistas Dinámicas con Animación de Entrada */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, y: 12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            >
              {currentSection === 'dashboard' && (
                <DashboardView
                  onNavigate={setCurrentSection}
                  onOpenNewSale={() => setIsNewSaleOpen(true)}
                />
              )}

              {currentSection === 'orders' && (
                <OrdersView
                  onOpenNewSale={() => setIsNewSaleOpen(true)}
                />
              )}

              {currentSection === 'settlements' && (
                <SettlementsView />
              )}

              {currentSection === 'summaries' && (
                <SummariesView />
              )}

              {/* Vistas en construcción que redirigen a órdenes o inicio */}
              {['cuentas', 'history', 'purchases', 'reports'].includes(currentSection) && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto space-y-4">
                  <h3 className="text-lg font-bold text-slate-800">Sección en integración</h3>
                  <p className="text-xs text-slate-500">
                    Estamos migrando esta vista al nuevo diseño Full Motion. Mientras tanto, puedes gestionar todas tus ventas en Pedidos o volver a Inicio.
                  </p>
                  <button
                    onClick={() => setCurrentSection('orders')}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer"
                  >
                    Ir a Pedidos
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Barra Inferior Móvil (Thumb-first) */}
      <BottomNav
        currentSection={currentSection}
        onNavigate={setCurrentSection}
        onOpenNewSale={() => setIsNewSaleOpen(true)}
      />

      {/* 4. Modal Nueva Venta */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
