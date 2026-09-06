import { RedirectToSignIn, useAuth } from "@clerk/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { assets } from "../assets/assets";
import Sidebar from "../components/Sidebar";

const Layout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-gray-100 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation menu"
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden cursor-pointer"
          >
            {sidebarOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
          <Link to="/" className="shrink-0">
            <img src={assets.logo} alt="Quickai" className="w-32 h-auto" />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs md:hidden transition-opacity duration-300"
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed md:sticky top-16 bottom-0 left-0 z-50 md:z-10 w-64 bg-white border-r border-gray-100 h-[calc(100vh-4rem)] transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 sm:p-8 md:p-10 max-w-7xl overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
