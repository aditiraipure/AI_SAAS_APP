import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
  Scissors,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { backendUrl } from "../utils/api";
import { useUserPlan } from "../utils/plan";

const RemoveObj = () => {
  const { getToken } = useAuth();
  const { isPremium } = useUserPlan();

  const [selectedFile, setSelectedFile] = useState(null);
  const [objectDescription, setObjectDescription] = useState("");
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
    if (!objectDescription.trim()) {
      toast.error("Please describe the object you want to remove");
      setError("Please describe the object you want to remove.");
      return;
    }

    if (!isPremium) {
      const msg =
        "This feature is available only on the Premium plan. Please upgrade your plan to access Object Removal.";
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
      formData.append("object", objectDescription.trim());

      const response = await fetch(`${backendUrl}/api/ai/remove-object`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove object from image");
      }

      setProcessedImg(data.imageUrl || data.content || null);
      toast.success("Object removed successfully!");
    } catch (err) {
      console.error("Remove object error:", err);
      const errMsg =
        err.message || "An error occurred while removing the object.";
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
            <div className="flex items-center gap-2 text-[#5C6AF1]">
              <Sparkles className="size-5 stroke-[2.2]" />
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Object Removal
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
              <span>Object removal is a Premium feature.</span>
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
          </div>

          {/* Describe Object Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe object to remove
            </label>
            <textarea
              rows={4}
              value={objectDescription}
              onChange={(e) => {
                setObjectDescription(e.target.value);
                setError("");
              }}
              placeholder="e.g., car in background, watch from wrist, person on left"
              className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 text-gray-800 placeholder-gray-400 transition-colors resize-none"
              required
            />
            <p className="text-xs text-gray-400 mt-2">
              Be specific about what you want to remove
            </p>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || !selectedFile || !objectDescription.trim()}
            className="w-full mt-4 bg-[#5C6AF1] hover:bg-indigo-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Removing object...</span>
              </>
            ) : (
              <>
                <Scissors className="size-4.5 stroke-[2.2]" />
                <span>Remove object</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Output Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-xs flex-1 min-h-[450px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-[#5C6AF1]">
              <Scissors className="size-5 stroke-[2.2]" />
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
              <div className="p-3 rounded-2xl border border-gray-100 shadow-sm max-h-[420px] bg-gray-50">
                <img
                  src={processedImg}
                  alt="Object Removed"
                  className="max-h-[380px] object-contain rounded-xl"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-8">
              <Scissors className="size-14 text-gray-300 stroke-[1.5]" />
              <p className="text-xs sm:text-sm text-gray-400 mt-4 max-w-xs">
                Upload an image and describe what to remove
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RemoveObj;
