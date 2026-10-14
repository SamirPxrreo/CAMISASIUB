import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopBar from './components/TopBar';
import DashboardView from './components/DashboardView';
import OrdersView from './components/OrdersView';
import CalendarView from './components/CalendarView';
import CuentasView from './components/CuentasView';
import HistoryView from './components/HistoryView';
import PurchasesView from './components/PurchasesView';
import SettlementsView from './components/SettlementsView';
import SummariesView from './components/SummariesView';
import ReportsView from './components/ReportsView';
import TrashView from './components/TrashView';
import SettingsView from './components/SettingsView';
import NewSaleModal from './components/NewSaleModal';
import ThemeModal from './components/ThemeModal';
import LoginView from './components/LoginView';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateNotifier from './components/UpdateNotifier';

const SECCIONES_VALIDAS = [
  'dashboard',
  'orders',
  'calendar',
  'cuentas',
  'history',
  'purchases',
  'settlements',
  'summaries',
  'reports',
  'trash',
  'settings'
];

function obtenerSeccionInicial() {
  if (typeof window === 'undefined') return 'dashboard';
  const h = window.location.hash.replace('#', '').trim().toLowerCase();
  return SECCIONES_VALIDAS.includes(h) ? h : 'dashboard';
}

function AppContent() {
  const { user, loading, role } = useAuth();
  const [currentSection, setCurrentSection] = useState(obtenerSeccionInicial);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [targetOrderForCuentas, setTargetOrderForCuentas] = useState(null);
  const mainContentRef = useRef(null);

  // Al cambiar de sección, volver siempre al inicio (arriba del todo)
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [currentSection]);

  const handleNavigateToCuentas = (order) => {
    setTargetOrderForCuentas(order);
    setCurrentSection('cuentas');
  };

  // Sincronizar hash en la URL cuando cambia la sección
  useEffect(() => {
    if (user && window.location.hash !== `#${currentSection}`) {
      window.location.hash = currentSection;
    }
  }, [currentSection, user]);

  // Escuchar evento hashchange para botones atrás/adelante del navegador
  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace('#', '').trim().toLowerCase();
      if (SECCIONES_VALIDAS.includes(h)) {
        if (h === 'settings' && role?.role !== 'admin') {
          setCurrentSection('dashboard');
          window.location.hash = 'dashboard';
        } else {
          setCurrentSection(h);
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [role]);

  // Proteger sección de configuración para que solo el admin pueda ingresar
  useEffect(() => {
    if (currentSection === 'settings' && role?.role !== 'admin') {
      setCurrentSection('dashboard');
      window.location.hash = 'dashboard';
    }
  }, [currentSection, role]);

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

  const handleOpenNewSale = () => {
    setEditingOrder(null);
    setIsNewSaleOpen(true);
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setIsNewSaleOpen(true);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex font-sans">
      {/* Notificador de actualización de la app */}
      <UpdateNotifier />

      {/* 1. Barra Lateral Fija (Desktop) */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={(sec) => {
          if (sec === 'new-sale') {
            handleOpenNewSale();
          } else {
            setCurrentSection(sec);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
      />

      {/* 2. Área Principal de Contenido (Scroll independiente para que el Sidebar nunca se baje) */}
      <div ref={mainContentRef} className="flex-1 h-full overflow-y-auto flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* TopBar */}
        <TopBar
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNewSale={handleOpenNewSale}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          onNavigate={setCurrentSection}
        />

        {/* Vistas Dinámicas con Animación de Entrada */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, y: 10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            >
              {currentSection === 'dashboard' && (
                <DashboardView
                  onNavigate={setCurrentSection}
                  onOpenNewSale={handleOpenNewSale}
                />
              )}

              {currentSection === 'orders' && (
                <OrdersView
                  onOpenNewSale={handleOpenNewSale}
                  onEditOrder={handleEditOrder}
                />
              )}

              {currentSection === 'calendar' && (
                <CalendarView
                  onEditOrder={handleEditOrder}
                  onNavigateToCuentas={handleNavigateToCuentas}
                />
              )}

              {currentSection === 'cuentas' && (
                <CuentasView
                  targetOrder={targetOrderForCuentas}
                  onClearTargetOrder={() => setTargetOrderForCuentas(null)}
                  onEditOrder={handleEditOrder}
                />
              )}

              {currentSection === 'history' && (
                <HistoryView
                  onEditOrder={handleEditOrder}
                />
              )}

              {currentSection === 'purchases' && (
                <PurchasesView />
              )}

              {currentSection === 'settlements' && (
                <SettlementsView />
              )}

              {currentSection === 'summaries' && (
                <SummariesView />
              )}

              {currentSection === 'reports' && (
                <ReportsView />
              )}

              {currentSection === 'trash' && (
                <TrashView />
              )}

              {currentSection === 'settings' && role?.role === 'admin' && (
                <SettingsView />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 3. Barra Inferior Móvil (Thumb-first) */}
      <BottomNav
        currentSection={currentSection}
        onNavigate={setCurrentSection}
        onOpenNewSale={handleOpenNewSale}
      />

      {/* 4. Modal Nueva Venta / Editar Pedido */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => {
          setIsNewSaleOpen(false);
          setEditingOrder(null);
        }}
        editingOrder={editingOrder}
      />

      {/* 5. Modal de Personalización de Tema */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
