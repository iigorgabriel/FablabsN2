import { useState, useEffect } from "react";
import Index from "./Index";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

const App = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    // Verificar se está autenticado como admin
    const authenticated = localStorage.getItem("admin_authenticated") === "true";
    setIsAdmin(authenticated);
    setShowAdminPanel(authenticated);
  }, []);

  const handleAdminLogin = () => {
    setIsAdmin(true);
    setShowAdminPanel(true);
  };

  const handleShowAdmin = () => {
    // Se não estiver autenticado, mostrar tela de login
    if (!isAdmin) {
      setShowAdminPanel(true);
    } else {
      setShowAdminPanel(true);
    }
  };

  // Se está tentando acessar o painel admin mas não está autenticado
  if (showAdminPanel && !isAdmin) {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  // Se está autenticado e quer ver o painel admin
  if (showAdminPanel && isAdmin) {
    return <AdminDashboard />;
  }

  // Tela principal com botão de admin
  return (
    <div>
      <Index />
      {/* Botão flutuante para acessar admin */}
      <button
        onClick={handleShowAdmin}
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:bg-primary/90 transition-colors z-50"
        title="Acesso Administrativo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </button>
    </div>
  );
};

export default App;
