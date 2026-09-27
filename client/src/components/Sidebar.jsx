import { SignOutButton, useUser } from "@clerk/react";
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
import { assets } from "../assets/assets";
import { useUserPlan } from "../utils/plan";

const navItems = [
  { name: "Dashboard", path: "/ai", icon: House },
  { name: "Resume Builder", path: "/ai/resume-builder", icon: Sparkles },
  { name: "Write Article", path: "/ai/write-article", icon: SquarePen },
  { name: "Blog Titles", path: "/ai/blog-titles", icon: Hash },
  { name: "Generate Images", path: "/ai/generate-images", icon: Image },
  { name: "Remove Background", path: "/ai/remove-background", icon: Eraser },
  { name: "Remove Object", path: "/ai/remove-object", icon: Scissors },
  { name: "Review Resume", path: "/ai/review-resume", icon: FileText },
  { name: "Community", path: "/ai/community", icon: Users },
];

const Sidebar = ({ onClose }) => {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  // Reactive verified plan from backend & Clerk Billing
  const { plan: userPlan } = useUserPlan();

  const handleNavClick = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <aside className="flex flex-col h-full px-4 py-6 bg-white select-none justify-between">
      <div>
        {/* Mobile Close Button */}
        {onClose && (
          <div className="flex justify-end md:hidden mb-2">
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

        {/* User Profile Section */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={user?.imageUrl || assets.profile_img_1}
            alt={user?.fullName || "User"}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-xs"
          />
          <h2 className="text-sm font-semibold text-gray-800 text-center mt-3">
            {user?.fullName || user?.firstName || "William Mark"}
          </h2>
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

      {/* Bottom User / Sign out Area */}
      <div className="pt-4 mt-6 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={user?.imageUrl || assets.profile_img_1}
            alt={user?.fullName || "User"}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">
              {user?.fullName || user?.firstName || "William Mark"}
            </p>
            <p className="text-[11px] text-gray-400 truncate capitalize">
              {userPlan}
            </p>
          </div>
        </div>

        <SignOutButton redirectUrl="/">
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="size-4.5" />
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
};

export default Sidebar;
