import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  Check,
  Copy,
  Hash,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const categories = [
  "General",
  "Technology",
  "Business",
  "Health",
  "Lifestyle",
  "Education",
  "Travel",
  "Food",
];

const Blogtitles = () => {
  const { getToken } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [generatedTitles, setGeneratedTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BASE_URL ||
    "http://localhost:5000";

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) {
      toast.error("Please enter a keyword or blog topic");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch(`${backendUrl}/api/ai/generate-blog-title`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: keyword,
          category: selectedCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate blog titles");
      }

      setGeneratedTitles(data.titles || []);
      toast.success("Blog titles generated successfully!");
    } catch (err) {
      console.error("Blog title generation error:", err);
      const errMsg =
        err.message || "An error occurred while generating blog titles.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (title, idx) => {
    navigator.clipboard.writeText(title);
    setCopiedIndex(idx);
    toast.success("Blog title copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Form Card - Height fits to button level */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-100 shadow-xs w-full lg:w-[380px] shrink-0 h-fit">
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2 text-purple-600">
            <Sparkles className="size-5 stroke-[2.2]" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              AI Title Generator
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Keyword Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Keyword / Topic
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="The future of artificial intelligence"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-gray-800 placeholder-gray-400 transition-colors"
              required
            />
          </div>

          {/* Category Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1.5 px-2.5 rounded-full text-xs font-medium text-center transition-all cursor-pointer truncate ${
                    selectedCategory === cat
                      ? "border border-purple-500 bg-purple-50 text-purple-600 font-semibold"
                      : "border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="w-full !mt-6 bg-[#9D33EC] hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Generating titles...</span>
              </>
            ) : (
              <>
                <Hash className="size-4.5 stroke-[2.2]" />
                <span>Generate title</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Output Card - Strictly Fixed Height h-[540px] with Internal Scroll */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs flex-1 w-full h-[540px] max-h-[540px] min-h-[540px] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 text-purple-600 pb-4 border-b border-gray-100 shrink-0">
          <Hash className="size-5 stroke-[2.2]" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Generated titles
          </h2>
        </div>

        {generatedTitles.length > 0 ? (
          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-2 scroll-smooth overscroll-contain">
            {generatedTitles.map((title, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-sm text-gray-800 font-medium hover:border-purple-200 transition-colors flex items-center justify-between gap-3 group shrink-0"
              >
                <span className="leading-relaxed break-words flex-1 min-w-0">
                  {title}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(title, idx)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors shrink-0 cursor-pointer"
                  title="Copy title"
                >
                  {copiedIndex === idx ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Hash className="size-14 text-gray-300 stroke-[1.5]" />
            <p className="text-xs sm:text-sm text-gray-400 mt-4 max-w-xs">
              Enter keywords and click &ldquo;Generate title&rdquo; to get
              started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blogtitles;
