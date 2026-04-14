import React from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  
  return (
    <div className={`flex flex-col min-h-screen ${isLandingPage ? '' : 'bg-canvas'}`}>
      <Navbar />
      <main className={`flex-grow ${isLandingPage ? '' : 'pt-[72px]'}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};
