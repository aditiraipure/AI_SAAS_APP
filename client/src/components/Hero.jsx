import { useClerk, useUser } from "@clerk/react";
import { ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import userGroup from "../assets/user_group.png";

const Hero = () => {
  const { openSignIn } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate("/ai");
      return;
    }

    openSignIn();
  };

  return (
    <main className="flex min-h-screen items-center bg-[url('/gradientBackground.png')] bg-cover bg-center bg-no-repeat px-4 pt-24 pb-12 sm:px-8">
      <section className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl">
          Create amazing content
          <br className="hidden sm:block" /> with{" "}
          <span className="text-primary">AI tools</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
          Transform your content creation with our suite of premium AI tools.
          Write articles, generate images, and enhance your workflow.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col justify-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <button
            type="button"
            onClick={handleGetStarted}
            className="group flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-medium text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-56"
          >
            Start creating now
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>

          <button
            type="button"
            onClick={() => navigate("/ai")}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white/70 px-7 py-3.5 font-medium text-gray-700 backdrop-blur transition-all duration-300 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-w-44"
          >
            <Play aria-hidden="true" className="size-4 fill-current" />
            Watch demo
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 text-sm text-gray-600 sm:flex-row sm:text-base">
          <img
            src={userGroup}
            alt="A group of Quick.ai creators"
            className="h-9 w-auto"
          />
          <span>Trusted by 10k+ people</span>
        </div>

      </section>
    </main>
  );
};

export default Hero;
