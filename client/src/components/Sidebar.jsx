import { SignOutButton, useClerk, useUser } from "@clerk/react";
import {
  Eraser,
  FileText,
  Hash,
  House,
  Image,
  LogOut,
  Scissors,
  Sparkles,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserPlan } from "../utils/plan";

const navItems = [
  { name: "Dashboard", path: "/ai", icon: House },
  { name: "Write Article", path: "/ai/write-article", icon: SquarePen },
  { name: "Blog Titles", path: "/ai/blog-titles", icon: Hash },
  { name: "Generate Images", path: "/ai/generate-images", icon: Image },
  { name: "Remove Background", path: "/ai/remove-background", icon: Eraser },
  { name: "Remove Object", path: "/ai/remove-object", icon: Scissors },
  { name: "Review Resume", path: "/ai/review-resume", icon: FileText },
  { name: "Resume Builder", path: "/ai/resume-builder", icon: Sparkles },
  { name: "Community", path: "/ai/community", icon: Users },
];

const Sidebar = ({ onClose }) => {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const location = useLocation();
  const navigate = useNavigate();

  // Reactive verified plan from backend & Clerk Billing
  const { plan: userPlan } = useUserPlan();

  const handleNavClick = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const displayName =
    user?.fullName || user?.firstName || "QuickAI Creator";

  const userInitial = (displayName[0] || "U").toUpperCase();
  const formattedPlan = userPlan ? `${userPlan} Plan` : "Free Plan";

  const handleOpenProfile = () => {
    if (typeof openUserProfile === "function") {
      openUserProfile();
    }
  };

  return (
    <aside className="flex flex-col h-full bg-white select-none">
      {/* Mobile Close Button */}
      {onClose && (
        <div className="flex justify-end md:hidden px-4 pt-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      {/* Scrollable Main Area (Upper Profile + Navigation) */}
      <div className="flex-1 overflow-y-auto px-4 py-5 min-h-0">
        {/* Upper User Profile Section */}
        <div className="flex flex-col items-center mb-6 shrink-0">
          <button
            type="button"
            onClick={handleOpenProfile}
            className="group flex flex-col items-center cursor-pointer focus:outline-none"
            title="Manage Account"
            aria-label="Manage Account"
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-xs group-hover:ring-2 group-hover:ring-blue-400 transition-all"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#465BCA] text-white flex items-center justify-center font-bold text-2xl border-2 border-gray-100 shadow-xs group-hover:ring-2 group-hover:ring-blue-400 transition-all">
                {userInitial}
              </div>
            )}
            <h2 className="text-sm font-semibold text-gray-800 text-center mt-3 group-hover:text-blue-600 transition-colors">
              {displayName}
            </h2>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#3C81F6] to-[#9234EA] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="size-4.5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Fixed Bottom Profile / Account Section */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
        <button
          type="button"
          onClick={handleOpenProfile}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer p-1.5 -ml-1.5 rounded-xl hover:bg-gray-50 transition-colors group focus:outline-none"
          title="Manage Account"
          aria-label="Manage Account"
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100 shadow-2xs"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#465BCA] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              {userInitial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-600 transition-colors">
              {displayName}
            </p>
            <p className="text-[11px] text-gray-400 truncate capitalize font-medium">
              {formattedPlan}
            </p>
          </div>
        </button>

        <SignOutButton redirectUrl="/">
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0 ml-1"
          >
            <LogOut className="size-4.5" />
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
};

export default Sidebar;
