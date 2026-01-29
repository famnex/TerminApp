import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Directory from './pages/Directory';
import BookingWizard from './pages/BookingWizard';
import AdminLogin from './pages/AdminLogin';
import RecoveryPage from './pages/RecoveryPage';
import CancellationPage from './pages/CancellationPage';
import Dashboard from './pages/Dashboard';
import AdminUserList from './pages/AdminUserList';
import Appointments from './pages/Appointments';
import Availability from './pages/Availability';
import Topics from './pages/Topics';
import Settings from './pages/Settings';
import BatchProcessing from './pages/BatchProcessing';
import UpdatePage from './pages/UpdatePage';
import HelpPage from './pages/HelpPage';
import SetupWizard from './pages/SetupWizard';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import './index.css';

import { Menu, X } from 'lucide-react';

// Admin Link Component that adapts to auth state
const AdminLink = ({ onClick }) => {
  const { user } = useAuth();
  return user ? (
    <Link to="/dashboard" onClick={onClick} className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm">Dashboard ({user.displayName})</Link>
  ) : (
    <Link to="/admin" onClick={onClick} className="text-muted-foreground hover:text-primary transition-colors font-medium text-sm">Login</Link>
  );
};

function App() {
  const [headerConfig, setHeaderConfig] = React.useState({ title: 'TerminApp', logo: null });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [isSetupChecked, setIsSetupChecked] = React.useState(false);
  const [needsSetup, setNeedsSetup] = React.useState(false);

  React.useEffect(() => {
    // Check Setup Status
    fetch('api/public/setup-status')
      .then(res => res.json())
      .then(data => {
        if (data.isSetup === false) {
          setNeedsSetup(true);
        }
        setIsSetupChecked(true);
      })
      .catch(err => {
        console.error("Setup check failed", err);
        setIsSetupChecked(true); // Proceed anyway on error to avoid blocking
      });

    console.log('App: Fetching settings...');
    fetch('api/public/settings')
      .then(res => {
        if (!res.ok) throw new Error('Status: ' + res.status);
        return res.json();
      })
      .then(data => {
        console.log('App: Settings received:', data);
        if (data) {
          setHeaderConfig({
            title: data.app_title || 'TerminApp',
            logo: data.school_logo || null
          });

          // Apply Primary Color
          if (data.primary_color) {
            const hex = data.primary_color;
            // Convert Hex to HSL
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
              r = "0x" + hex[1] + hex[1];
              g = "0x" + hex[2] + hex[2];
              b = "0x" + hex[3] + hex[3];
            } else if (hex.length === 7) {
              r = "0x" + hex[1] + hex[2];
              g = "0x" + hex[3] + hex[4];
              b = "0x" + hex[5] + hex[6];
            }
            r = +r / 255;
            g = +g / 255;
            b = +b / 255;
            let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
            let h = 0, s = 0, l = 0;
            if (delta === 0) h = 0;
            else if (cmax === r) h = ((g - b) / delta) % 6;
            else if (cmax === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
            l = (cmax + cmin) / 2;
            s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
            s = +(s * 100).toFixed(1);
            l = +(l * 100).toFixed(1);

            // Set CSS Variables
            const hslValue = `${h} ${s}% ${l}%`;
            document.documentElement.style.setProperty('--primary', hslValue);
            document.documentElement.style.setProperty('--ring', hslValue);
          }
        }
      })
      .catch(err => console.error('Failed to load header config:', err));
  }, []);

  if (!isSetupChecked) return null; // Or a loading spinner

  if (needsSetup) {
    return (
      <AuthProvider>
        <SetupWizard />
        <Toaster />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased text-foreground flex flex-col">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-16 items-center justify-between">
              <Link to="/" className="flex items-center gap-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-500 tracking-tight">
                {headerConfig.logo && (
                  <img src={headerConfig.logo} alt="Logo" className="h-8 w-auto object-contain" />
                )}
                <span>{headerConfig.title}</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/recover" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Termin absagen</Link>
                <AdminLink />
              </nav>

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-muted-foreground hover:text-primary"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Nav Container */}
            {isMobileMenuOpen && (
              <div className="md:hidden border-t bg-background">
                <nav className="container flex flex-col gap-4 py-4">
                  <Link
                    to="/recover"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Termin absagen
                  </Link>
                  <AdminLink onClick={() => setIsMobileMenuOpen(false)} />
                </nav>
              </div>
            )}
          </header>

          <main className="container py-8 md:py-12 flex-1">
            <Routes>
              <Route path="/" element={<Directory />} />
              <Route path="/book/:userId" element={<BookingWizard />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/recover" element={<RecoveryPage />} />
              <Route path="/cancel/:token" element={<CancellationPage />} />

              {/* Protected Administration Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard/users" element={<AdminUserList />} />
                <Route path="/dashboard/appointments" element={<Appointments />} />
                <Route path="/dashboard/availability" element={<Availability />} />
                <Route path="/dashboard/topics" element={<Topics />} />
                <Route path="/dashboard/settings" element={<Settings />} />
                <Route path="/dashboard/batch" element={<BatchProcessing />} />
                <Route path="/dashboard/updates" element={<UpdatePage />} />
                <Route path="/dashboard/help" element={<HelpPage />} />
              </Route>
            </Routes>
          </main>
          <Footer />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
