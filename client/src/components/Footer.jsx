import { assets } from "../assets/assets";

const Footer = () => {
  return (
    <footer className="px-4 sm:px-20 xl:px-32 pt-16 pb-8 bg-white border-t border-gray-100">
      <div className="flex flex-col lg:flex-row justify-between gap-10 lg:gap-12">
        {/* Left: Brand / Logo & Description */}
        <div className="max-w-md">
          <img
            src={assets.logo}
            alt="Quickai"
            className="w-32 sm:w-36 h-auto"
          />
          <p className="text-gray-500 text-sm mt-6 leading-relaxed">
            Experience the power of AI with QuickAi. Transform your content
            creation with our suite of premium AI tools. Write articles,
            generate images, and enhance your workflow.
          </p>
        </div>

        {/* Middle: Company Links */}
        <div className="text-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
          <ul className="space-y-2.5 text-gray-500">
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                Home
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                About us
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                Contact us
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-primary transition-colors">
                Privacy policy
              </a>
            </li>
          </ul>
        </div>

        {/* Right: Newsletter Subscription */}
        <div className="max-w-md">
          <h3 className="font-semibold text-gray-900 mb-4">
            Subscribe to our newsletter
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            The latest news, articles, and resources, sent to your inbox weekly.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex items-center gap-2 sm:gap-3"
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full max-w-xs px-4 py-2.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-primary text-gray-700 placeholder-gray-400"
            />
            <button
              type="submit"
              className="bg-primary hover:opacity-90 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-gray-200 mt-14 mb-6" />

      {/* Copyright */}
      <p className="text-center text-xs sm:text-sm text-gray-500">
        Copyright 2026 © Quickai. All Right Reserved.
      </p>
    </footer>
  );
};

export default Footer;
