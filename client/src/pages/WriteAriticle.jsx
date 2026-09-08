import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Sparkles,
  SquarePen,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { backendUrl } from "../utils/api";

const WriteAriticle = () => {
  const { getToken } = useAuth();
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState("short"); // 'short', 'medium', or 'long'
  const [generatedArticle, setGeneratedArticle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter an article topic or prompt");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch(`${backendUrl}/api/ai/generate-article`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: topic,
          length: length,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate article");
      }

      setGeneratedArticle(data.article || data.content || "");
      toast.success("Article generated successfully!");
    } catch (err) {
      console.error("Article generation error:", err);
      const errMsg =
        err.message || "An error occurred while generating the article.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedArticle) return;
    navigator.clipboard.writeText(generatedArticle);
    setCopied(true);
    toast.success("Article copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Form Card - Height fits to button level, increased width for 2 categories per line */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-100 shadow-xs w-full lg:w-[420px] shrink-0 h-fit">
        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2 text-blue-500">
            <Sparkles className="size-5 stroke-[2.2]" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              AI Article Writer
            </h2>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Article Topic Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="The future of artificial intelligence"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-gray-800 placeholder-gray-400 transition-colors"
              required
            />
          </div>

          {/* Article Length Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Length
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "short", label: "Short (200–400 words)" },
                { id: "medium", label: "Medium (400–600 words)" },
                { id: "long", label: "Long (600–800 words)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLength(opt.id)}
                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    length === opt.id
                      ? "border border-blue-500 bg-blue-50 text-blue-600 font-semibold"
                      : "border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="w-full !mt-6 bg-[#3588F2] hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Generating article...</span>
              </>
            ) : (
              <>
                <SquarePen className="size-4.5 stroke-[2.2]" />
                <span>Generate article</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Output Card - Fixed Height with overscroll containment preventing page scrolling */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs flex-1 w-full h-[540px] max-h-[540px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-blue-500">
            <SquarePen className="size-5 stroke-[2.2]" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Generated article
            </h2>
          </div>
          {generatedArticle && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors cursor-pointer"
              title="Copy Article"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {generatedArticle ? (
          <div className="flex-1 overflow-y-auto mt-4 pr-2 text-sm text-gray-700 leading-relaxed scroll-smooth overscroll-contain">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-gray-900 mt-2 mb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-bold text-gray-900 mt-4 mb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-gray-900 mt-3 mb-1">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="my-2.5 leading-relaxed text-gray-700">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 my-2 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">
                    {children}
                  </code>
                ),
              }}
            >
              {generatedArticle}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <SquarePen className="size-14 text-gray-300 stroke-[1.5]" />
            <p className="text-xs sm:text-sm text-gray-400 mt-4 max-w-xs">
              Enter a topic and click &ldquo;Generate article&rdquo; to get
              started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WriteAriticle;
