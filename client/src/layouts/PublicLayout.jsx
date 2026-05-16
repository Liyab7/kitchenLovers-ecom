import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import MobileBottomNav from '../components/layout/MobileBottomNav.jsx';
import WhatsAppWidget from '../components/common/WhatsAppWidget.jsx';
import InstallPrompt from '../components/common/InstallPrompt.jsx';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 md:pb-6">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <WhatsAppWidget />
      <InstallPrompt />
    </div>
  );
}
