import { useAuth, useUser } from "@clerk/react";
import { AlertCircle, Heart, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { backendUrl } from "../utils/api";

const Community = () => {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { user } = useUser();

  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likingIds, setLikingIds] = useState(new Set());

  const fetchPublished = useCallback(
    async (isManual = false) => {
      setLoading(true);
      setError("");

      try {
        const token = await getToken();
        const response = await fetch(
          `${backendUrl}/api/user/published-creations`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load community creations");
        }

        setCreations(data.creations || []);
        if (isManual) {
          toast.success("Community feed refreshed!");
        }
      } catch (err) {
        console.error("Community fetch error:", err);
        const errMsg =
          err.message || "Unable to fetch community creations at this time.";
        setError(errMsg);
        if (isManual) {
          toast.error(errMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, getToken],
  );

  useEffect(() => {
    let ignore = false;
    if (isAuthLoaded) {
      (async () => {
        try {
          const token = await getToken();
          const response = await fetch(
            `${backendUrl}/api/user/published-creations`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          const data = await response.json();

          if (!ignore) {
            if (!response.ok) {
              setError(data.message || "Failed to load community creations");
            } else {
              setCreations(data.creations || []);
            }
          }
        } catch (err) {
          if (!ignore) {
            console.error("Community fetch error:", err);
            setError(
              err.message ||
                "Unable to fetch community creations at this time.",
            );
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      })();
    }
    return () => {
      ignore = true;
    };
  }, [isAuthLoaded, backendUrl, getToken]);

  const handleLikeToggle = async (creationId) => {
    if (!creationId || !user?.id) return;
    if (likingIds.has(creationId)) return; // Prevent double click race

    const currentUserId = user.id;

    // Track in-flight like request
    setLikingIds((prev) => new Set(prev).add(creationId));

    // Save previous state for rollback on failure
    const prevCreations = [...creations];

    // Optimistic update
    setCreations((prev) =>
      prev.map((item) => {
        const itemId = item._id || item.id;
        if (itemId === creationId) {
          const currentLikes = Array.isArray(item.likes) ? item.likes : [];
          const hasLiked = currentLikes.includes(currentUserId);
          const newLikes = hasLiked
            ? currentLikes.filter((uid) => uid !== currentUserId)
            : [...currentLikes, currentUserId];
          return { ...item, likes: newLikes };
        }
        return item;
      }),
    );

    try {
      const token = await getToken();
      const response = await fetch(
        `${backendUrl}/api/user/creations/${creationId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update like status");
      }

      // Sync exact likes array from server
      setCreations((prev) =>
        prev.map((item) => {
          const itemId = item._id || item.id;
          if (itemId === creationId) {
            return {
              ...item,
              likes: data.likes || data.creation?.likes || item.likes,
            };
          }
          return item;
        }),
      );

      if (data.isLiked) {
        toast.success("Creation liked!");
      } else {
        toast.success("Creation unliked!");
      }
    } catch (err) {
      console.error("Like toggle error:", err);
      const errMsg = err.message || "Failed to update like status";
      toast.error(errMsg);
      // Revert optimistic update
      setCreations(prevCreations);
    } finally {
      setLikingIds((prev) => {
        const next = new Set(prev);
        next.delete(creationId);
        return next;
      });
    }
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2.5">
            Community Creations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Explore public AI creations generated by the community.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchPublished(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 transition-colors px-3 py-2 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          title="Refresh feed"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Loader2 className="size-8 animate-spin text-blue-500 mb-3" />
          <p className="text-sm">Loading community creations...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchPublished}
            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition font-medium cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && creations.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="size-7" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">
            No community creations yet
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1.5">
            Be the first to publish an AI creation to the community! When
            generating images or articles, enable "Publish to Community".
          </p>
        </div>
      )}

      {/* 3-Card-Per-Row Responsive Grid on Desktop */}
      {!loading && !error && creations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creations.map((item) => {
            const creationId = item._id || item.id;
            const currentUserId = user?.id || "";
            const isLiked =
              Array.isArray(item.likes) && item.likes.includes(currentUserId);
            const likesCount = Array.isArray(item.likes)
              ? item.likes.length
              : 0;
            const isLiking = likingIds.has(creationId);

            const isImage =
              item.type === "image" ||
              item.type === "remove-bg" ||
              item.type === "remove-background" ||
              item.type === "remove-object" ||
              (typeof item.content === "string" &&
                (item.content.startsWith("http://") ||
                  item.content.startsWith("https://") ||
                  item.content.startsWith("data:image")));

            return (
              <div
                key={creationId}
                className="group bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Creation Content / Image Container */}
                {isImage ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
                    <img
                      src={item.content}
                      alt={item.prompt || "AI Creation"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Type Badge Overlay */}
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-xs text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="size-3 text-amber-300" />
                      <span className="capitalize">
                        {item.type || "AI Image"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50/30 p-5 flex flex-col justify-between">
                    <p className="text-xs text-gray-700 line-clamp-6 leading-relaxed">
                      {item.content}
                    </p>
                    {/* Type Badge */}
                    <div className="self-end bg-blue-600/90 text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="size-3 text-amber-300" />
                      <span className="capitalize">
                        {item.type || "Article"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Footer / Details */}
                <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                  {/* Prompt */}
                  <div>
                    <p
                      className="text-sm font-medium text-gray-800 line-clamp-2 leading-relaxed"
                      title={item.prompt}
                    >
                      {item.prompt}
                    </p>
                  </div>

                  {/* Creator and Likes Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <div className="truncate max-w-[65%]">
                      <span className="text-gray-400">By: </span>
                      <span
                        className="font-medium text-gray-700 text-xs truncate"
                        title={
                          item.userName || item.name || "Community Creator"
                        }
                      >
                        {item.userName || item.name || "Community Creator"}
                      </span>
                    </div>

                    {/* Likes Button */}
                    <button
                      type="button"
                      disabled={isLiking}
                      onClick={() => handleLikeToggle(creationId)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                        isLiked
                          ? "bg-rose-50 text-rose-600 font-semibold"
                          : "hover:bg-gray-100 text-gray-600"
                      }`}
                      title={isLiked ? "Unlike" : "Like"}
                    >
                      <Heart
                        className={`size-4 transition-colors ${
                          isLiked
                            ? "fill-rose-500 text-rose-500"
                            : "text-gray-500"
                        }`}
                      />
                      <span className="text-xs font-medium">{likesCount}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Community;
