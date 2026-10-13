import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const USER_ROLES_DEFAULT = {
  "admin@gmail.com": { nombre: "Administrador", role: "admin", vendedor: null },
  "samir@gmail.com": { nombre: "Samir", role: "vendedor", vendedor: "Samir" },
  "val@gmail.com":   { nombre: "Valentina", role: "vendedor", vendedor: "Valentina" }
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState({ role: 'admin', vendedor: null, nombre: 'Invitado' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserSession(session.user);
      } else {
        // En modo dev o si no hay sesión, permitir login rápido o estado inicial
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleUserSession(session.user);
      } else {
        setUser(null);
        setRole({ role: 'admin', vendedor: null, nombre: 'Invitado' });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserSession = async (authUser) => {
    setUser(authUser);
    const email = (authUser.email || '').toLowerCase();
    
    // Buscar en defaults
    if (USER_ROLES_DEFAULT[email]) {
      setRole(USER_ROLES_DEFAULT[email]);
      setLoading(false);
      return;
    }

    // Buscar en base de datos si existe tabla usuarios
    try {
      const { data } = await supabase.from('usuarios').select('*').eq('correo', email).single();
      if (data) {
        setRole({
          nombre: data.nombre || email.split('@')[0],
          role: data.rol || 'vendedor',
          vendedor: data.vendedor || data.nombre
        });
      } else {
        setRole({ nombre: email.split('@')[0], role: 'vendedor', vendedor: email.split('@')[0] });
      }
    } catch {
      setRole({ nombre: email.split('@')[0], role: 'vendedor', vendedor: email.split('@')[0] });
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Login de demostración rápido
  const demoLogin = (roleType) => {
    if (roleType === 'admin') {
      setUser({ id: 'demo-admin', email: 'admin@gmail.com' });
      setRole({ nombre: 'Admin Samir', role: 'admin', vendedor: null });
    } else {
      setUser({ id: 'demo-samir', email: 'samir@gmail.com' });
      setRole({ nombre: 'Samir', role: 'vendedor', vendedor: 'Samir' });
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
