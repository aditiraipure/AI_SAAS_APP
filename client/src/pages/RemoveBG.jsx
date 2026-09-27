import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  Eraser,
  ExternalLink,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { backendUrl } from "../utils/api";
import { useUserPlan } from "../utils/plan";

const RemoveBG = () => {
  const { getToken } = useAuth();
  const { isPremium } = useUserPlan();

  const [selectedFile, setSelectedFile] = useState(null);
  const [processedImg, setProcessedImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BASE_URL ||
    "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select an image file first");
      setError("Please select an image file first.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Image file size exceeds the 5MB limit");
      setError("Image file size exceeds the 5MB limit");
      return;
    }

    if (!isPremium) {
      const msg =
        "This feature is available only on the Premium plan. Please upgrade your plan to access Background Removal.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(`${backendUrl}/api/ai/remove-background`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove background");
      }

      setProcessedImg(data.imageUrl || data.content || null);
      toast.success("Background removed successfully!");
    } catch (err) {
      console.error("Remove background error:", err);
      const errMsg =
        err.message || "An error occurred while removing background.";
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F76C1C]">
              <Sparkles className="size-5 stroke-[2.2]" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Background Removal
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
              <span>Background removal is a Premium feature.</span>
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

          {/* Upload Image Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setSelectedFile(e.target.files[0]);
                setError("");
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 border border-gray-200 rounded-lg p-2 focus:outline-none cursor-pointer"
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              Supports JPG, PNG, WEBP (Max 5 MB)
            </p>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full mt-4 bg-[#F76C1C] hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Removing background...</span>
              </>
            ) : (
              <>
                <Eraser className="size-4.5 stroke-[2.2]" />
                <span>Remove background</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Output Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs flex-1 min-h-[450px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-[#F76C1C]">
              <Eraser className="size-5 stroke-[2.2]" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Processed Image
              </h2>
            </div>
            {processedImg && (
              <div className="flex items-center gap-2">
                <a
                  href={processedImg}
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

          {processedImg ? (
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="p-4 rounded-2xl border border-gray-100 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] max-h-[420px]">
                <img
                  src={processedImg}
                  alt="Background Removed"
                  className="max-h-[380px] object-contain rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-8">
              <Eraser className="size-14 text-gray-300 stroke-[1.5]" />
              <p className="text-xs sm:text-sm text-gray-400 mt-4 max-w-xs">
                Upload an image and click &ldquo;Remove background&rdquo; to get
                started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemoveBG;
