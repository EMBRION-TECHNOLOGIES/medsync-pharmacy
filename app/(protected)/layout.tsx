'use client';

import { useAuth } from '@/features/auth/hooks';
import { useOrg } from '@/store/useOrg';
import { usePharmacyProfile } from '@/features/pharmacy/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useChatOrdersSocket } from '@/features/chat-orders/useChatOrdersSocket';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const { pharmacyId, setPharmacy } = useOrg();
  const { data: pharmacyProfile, isLoading: pharmacyProfileLoading, error: pharmacyProfileError } = usePharmacyProfile();
  
  // CRITICAL: All hooks must be called before any conditional returns
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Initialize socket connection globally for all protected pages
  useChatOrdersSocket();
  
  // Debug logging for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Protected Layout Debug:', {
      isAuthenticated,
      user,
      pharmacyProfile,
      pharmacyProfileLoading,
      pharmacyProfileError
    });
  }


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect PHARMACY_OWNER users without pharmacy to complete registration
  useEffect(() => {
    if (isAuthenticated && user?.role === 'PHARMACY_OWNER' && !pharmacyProfileLoading) {
      // Check if user doesn't have a pharmacy assigned
      if (pharmacyProfile && (pharmacyProfile as any)?.pharmacy === null) {
        // Only redirect if we're not already on the signup page and not on the login page
        const currentPath = window.location.pathname;
        if (currentPath !== '/signup' && currentPath !== '/login') {
          router.push('/signup');
        }
      }
    }
  }, [isAuthenticated, user, pharmacyProfile, pharmacyProfileLoading, router]);

  useEffect(() => {
    // Set pharmacy ID from pharmacy profile if available
    if (pharmacyProfile?.id && !pharmacyId) {
      setPharmacy(pharmacyProfile.id, pharmacyProfile.name);
    }
  }, [pharmacyProfile, pharmacyId, setPharmacy]);

  // Socket connection is now handled by individual page hooks
  // No need for global socket management in layout

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>
      {/* Desktop sidebar - always visible on large screens */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:block lg:w-64">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar />
          </div>
        </>
      )}

      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

