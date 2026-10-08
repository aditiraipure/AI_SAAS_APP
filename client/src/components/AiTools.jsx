import { useNavigate } from "react-router-dom";
import { AiToolsData } from "../assets/assets";

const AiTools = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 sm:px-8 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight">
            Powerful AI Tools
          </h2>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Everything you need to create, enhance, and optimize your content
            with cutting-edge AI technology.
          </p>
        </div>

        {/* AI Tools Grid */}
        <div className="mt-14 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {AiToolsData.map((tool, index) => {
            const Icon = tool.Icon;
            return (
              <div
                key={index}
                onClick={() => navigate(tool.path)}
                className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col text-left"
              >
                {/* Icon Container */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${tool.bg.from}, ${tool.bg.to})`,
                  }}
                >
                  <Icon className="size-6 text-white stroke-[2.2]" />
                </div>

                {/* Title */}
                <h3 className="mt-6 text-lg sm:text-xl font-semibold text-gray-900">
                  {tool.title}
                </h3>

                {/* Description */}
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {tool.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AiTools;
