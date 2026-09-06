import { UserButton, useClerk, useUser } from "@clerk/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../assets/logo.svg";

const Navbar = () => {
  const { openSignIn } = useClerk();
  const { user } = useUser();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed z-[5] w-full backdrop-blur-2xl flex justify-between items-center py-3 px-4 sm:px-20 xl:px-32 cursor-pointer"
    >
      <Link to="/" aria-label="Quick.ai home" className="shrink-0">
        <img
          src={Logo}
          alt="Quick.ai"
          className="w-28 sm:w-32 md:w-36 lg:w-40 xl:w-44 h-auto"
        />
      </Link>

      {user ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <button
          type="button"
          onClick={() => openSignIn()}
          className="bg-primary text-white flex items-center gap-2 rounded-full px-5 py-2.5 sm:px-6 sm:py-3 font-medium transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:shadow-indigo-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>Get Started</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      )}
    </nav>
  );
};

export default Navbar;
