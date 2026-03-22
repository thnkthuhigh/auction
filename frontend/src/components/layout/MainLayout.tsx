import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function MainLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className={`min-h-screen flex flex-col ${isAdminRoute ? 'bg-slate-100' : 'bg-gray-50'}`}>
      <Navbar />
      <main
        className={
          isAdminRoute ? 'flex-1 w-full px-0 py-0' : 'flex-1 container mx-auto px-4 py-8 max-w-7xl'
        }
      >
        <Outlet />
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
}
