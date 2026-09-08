import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { backendUrl } from "../utils/api";
import { useUserPlan } from "../utils/plan";

const ReviewResume = () => {
  const { getToken } = useAuth();
  const { isPremium } = useUserPlan();

  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a resume file first");
      setError("Please select a resume file first.");
      return;
    }

    if (!isPremium) {
      const msg =
        "This feature is available only on the Premium plan. Please upgrade your plan to access Resume Review.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // Validate supported file types
    const validExtensions = [".pdf", ".doc", ".docx"];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      toast.error("Please upload a valid PDF, DOC, or DOCX file");
      setError("Please upload a valid PDF, DOC, or DOCX file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Resume file size exceeds the 5 MB limit");
      setError("Resume file size exceeds the 5 MB limit.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("resume", selectedFile);

      const response = await fetch(`${backendUrl}/api/ai/resume-review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to review resume");
      }

      setAnalysisResult(data.review || data.content || "");
      toast.success("Resume reviewed successfully!");
    } catch (err) {
      console.error("Resume review error:", err);
      const errMsg =
        err.message || "An error occurred while reviewing the resume.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    toast.success("Resume review copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
      {/* Left Form Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs w-full lg:max-w-md flex flex-col justify-between">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#12B7AC]">
              <Sparkles className="size-5 stroke-[2.2]" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Resume Review
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
              <span>Resume review is a Premium feature.</span>
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

          {/* Upload Resume Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Resume
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                setSelectedFile(e.target.files[0]);
                setError("");
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 border border-gray-200 rounded-lg p-2 focus:outline-none cursor-pointer"
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              Supports PDF, DOC, and DOCX formats (Max 5 MB)
            </p>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full mt-4 bg-[#12B7AC] hover:bg-teal-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Analyzing Resume...</span>
              </>
            ) : (
              <>
                <FileText className="size-4.5 stroke-[2.2]" />
                <span>Review Resume</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Output Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs flex-1 min-h-[450px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-[#12B7AC]">
              <FileText className="size-5 stroke-[2.2]" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Analysis Results
              </h2>
            </div>
            {analysisResult && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                title="Copy Analysis"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium">
                      Copied!
                    </span>
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

          {analysisResult ? (
            <div className="mt-6 text-sm text-gray-700 leading-relaxed max-h-[550px] overflow-y-auto pr-2">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-100">
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
                    <ul className="list-disc pl-5 my-2 space-y-1">
                      {children}
                    </ul>
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
                }}
              >
                {analysisResult}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-8">
              <FileText className="size-14 text-gray-300 stroke-[1.5]" />
              <p className="text-xs sm:text-sm text-gray-400 mt-4 max-w-xs">
                Upload your resume and click &ldquo;Review Resume&rdquo; to get
                started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewResume;
