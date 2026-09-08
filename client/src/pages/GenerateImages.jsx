import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { backendUrl } from "../utils/api";
import { useUserPlan } from "../utils/plan";

const styles = [
  "Realistic",
  "Ghibli Style",
  "Anime Style",
  "Cartoon Style",
  "Fantasy Style",
  "3D Style",
  "Portrait Style",
];

const GenerateImages = () => {
  const { getToken } = useAuth();
  const { isPremium } = useUserPlan();

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Realistic");
  const [isPublic, setIsPublic] = useState(false);
  const [generatedImg, setGeneratedImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      toast.error("Please enter a description for the image");
      return;
    }

    if (!isPremium) {
      const msg =
        "This feature is available only on the Premium plan. Please upgrade your plan to access AI Image Generation.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch(`${backendUrl}/api/ai/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          style: style,
          isPublic: isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate image");
      }

      setGeneratedImg(data.imageUrl || data.content || null);
      toast.success("AI image generated successfully!");
    } catch (err) {
      console.error("Image generation error:", err);
      const errMsg =
        err.message || "An error occurred while generating the image.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
      {/* Left Form Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs w-full lg:max-w-md flex flex-col justify-between">
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#20C363]">
              <Sparkles className="size-5 stroke-[2.2]" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                AI Image Generator
              </h2>
            </div>
            {!isPremium && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                <Lock className="size-3" />
                Premium
              </span>
            )}
          </div>

          {/* Premium required banner */}
          {!isPremium && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
              <span>Image generation is a Premium feature.</span>
              <Link
                to="/"
                className="shrink-0 font-semibold text-amber-700 hover:text-amber-800 underline"
              >
                Upgrade
              </Link>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="size-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Description Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe your image
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to see in detail..."
              className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#20C363] text-gray-800 placeholder-gray-400 transition-colors resize-none"
              required
            />
          </div>

          {/* Style Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style
            </label>
            <div className="flex flex-wrap gap-2">
              {styles.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    style === s
                      ? "border border-[#20C363] bg-[#20C363]/10 text-[#20C363] font-semibold"
                      : "border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Make Image Public Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Make image public
              </p>
              <p className="text-xs text-gray-400">
                Share this creation with the community
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublic ? "bg-[#20C363]" : "bg-gray-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isPublic ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-full mt-2 bg-[#20C363] hover:bg-green-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Generating Image...</span>
              </>
            ) : (
              <>
                <ImageIcon className="size-4.5 stroke-[2.2]" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Output Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs flex-1 min-h-[450px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-green-500">
              <ImageIcon className="size-5 stroke-[2.2]" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Generated image
              </h2>
            </div>
            {generatedImg && (
              <div className="flex items-center gap-2">
                <a
                  href={generatedImg}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Open</span>
                </a>
              </div>
            )}
          </div>

          {generatedImg ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-4">
              <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm max-h-[420px] bg-gray-50">
                <img
                  src={generatedImg}
                  alt="Generated AI Creation"
                  className="max-h-[400px] w-full object-contain rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-8">
              <ImageIcon className="size-14 text-gray-300 stroke-[1.5]" />
              <p className="text-xs sm:text-sm text-gray-400 mt-4 max-w-xs">
                Enter a description and click &ldquo;Generate Image&rdquo; to
                get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateImages;
