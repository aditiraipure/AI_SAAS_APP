import { useAuth } from "@clerk/react";
import {
  AlertCircle,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import CreationsItem from "../components/CreationsItem";
import { backendUrl } from "../utils/api";
import { useUserPlan } from "../utils/plan";

const Dashboard = () => {
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const { plan: userPlan, refreshPlan } = useUserPlan();

  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCreations = useCallback(
    async (isManual = false) => {
      setLoading(true);
      setError("");

      try {
        const token = await getToken();
        const response = await fetch(`${backendUrl}/api/user/creations`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load creations");
        }

        setCreations(data.creations || []);
        if (typeof refreshPlan === "function") {
          refreshPlan();
        }
        if (isManual) {
          toast.success("Creations refreshed!");
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        const errMsg =
          err.message || "Unable to fetch your creations at this time.";
        setError(errMsg);
        if (isManual) {
          toast.error(errMsg);
        }
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, getToken, refreshPlan],
  );

  useEffect(() => {
    let ignore = false;
    if (isAuthLoaded) {
      (async () => {
        try {
          const token = await getToken();
          const response = await fetch(`${backendUrl}/api/user/creations`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          const data = await response.json();

          if (!ignore) {
            if (!response.ok) {
              setError(data.message || "Failed to load creations");
            } else {
              setCreations(data.creations || []);
            }
          }
        } catch (err) {
          if (!ignore) {
            console.error("Dashboard fetch error:", err);
            setError(
              err.message || "Unable to fetch your creations at this time.",
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

  return (
    <div className="w-full">
      {/* Top Stat Cards Row */}
      <div className="flex flex-wrap gap-5">
        {/* Total Creations Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between w-full sm:w-64">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Creations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? "..." : creations.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#3588F2] to-[#0BB0D7] shadow-xs">
            <Sparkles className="size-5.5 stroke-[2.2]" />
          </div>
        </div>

        {/* Plan Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex items-center justify-between w-full sm:w-64">
          <div>
            <p className="text-xs text-gray-500 font-medium">Plan Status</p>
            <p className="text-lg font-bold text-gray-900 mt-1 capitalize">
              {userPlan}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#B153EA] to-[#E549A3] shadow-xs">
            <MousePointerClick className="size-5.5 stroke-[2.2]" />
          </div>
        </div>

        {/* Community Section Card */}
        <Link
          to="/ai/community"
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all flex items-center justify-between w-full sm:w-64 cursor-pointer group"
        >
          <div>
            <p className="text-xs text-gray-500 font-medium">Community</p>
            <p className="text-lg font-bold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">
              Explore
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-[#10B981] to-[#059669] shadow-xs group-hover:scale-105 transition-transform">
            <Users className="size-5.5 stroke-[2.2]" />
          </div>
        </Link>
      </div>

      {/* Recent Creations Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Recent Creations</h2>
          <button
            type="button"
            onClick={() => fetchCreations(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors p-1 rounded-md hover:bg-gray-100 cursor-pointer disabled:opacity-50"
            title="Refresh creations"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="size-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm">Loading your creations...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchCreations}
              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && creations.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="size-7" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">
              No creations yet
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1.5 mb-6">
              You haven't generated any AI articles, blog titles, images, or
              reviews yet. Start exploring the tools below!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/ai/write-article"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition"
              >
                Write Article
              </Link>
              <Link
                to="/ai/generate-images"
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
              >
                Generate Image
              </Link>
            </div>
          </div>
        )}

        {/* Creations List */}
        {!loading && !error && creations.length > 0 && (
          <div className="space-y-3.5 max-w-4xl">
            {creations.map((item) => (
              <CreationsItem key={item._id || item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
