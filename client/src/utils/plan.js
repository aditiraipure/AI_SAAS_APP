import { useAuth, useUser } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";

const listeners = new Set();
let globalPlanState = {
  plan: "Free",
  isPremium: false,
  freeUsage: 0,
  isLoaded: false,
};

// Try to initialize from sessionStorage for fast initial render without flash
try {
  const stored = sessionStorage.getItem("quickai_user_plan");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed.plan === "string") {
      globalPlanState = { ...globalPlanState, ...parsed, isLoaded: true };
    }
  }
} catch {
  // Ignore storage errors in restricted browser contexts
}

const setGlobalPlan = (newState) => {
  globalPlanState = { ...globalPlanState, ...newState, isLoaded: true };
  try {
    sessionStorage.setItem(
      "quickai_user_plan",
      JSON.stringify({
        plan: globalPlanState.plan,
        isPremium: globalPlanState.isPremium,
        freeUsage: globalPlanState.freeUsage,
      }),
    );
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((fn) => fn(globalPlanState));
};

/**
 * Extract and normalize the user's active billing plan from Clerk user object or verified state
 */
export const getUserPlan = (user, explicitPlan) => {
  if (explicitPlan && typeof explicitPlan === "string") {
    const trimmed = explicitPlan.trim().toLowerCase();
    if (trimmed.includes("premium")) return "Premium";
    if (trimmed.includes("pro")) return "Pro";
    if (trimmed.includes("basic")) return "Basic";
    if (trimmed.includes("free") || trimmed.includes("trial")) return "Free";
    return explicitPlan.charAt(0).toUpperCase() + explicitPlan.slice(1);
  }

  if (globalPlanState.isLoaded && globalPlanState.plan) {
    return globalPlanState.plan;
  }

  if (!user) return "Free";

  const raw =
    user.publicMetadata?.plan ||
    user.unsafeMetadata?.plan ||
    user.publicMetadata?.subscription ||
    user.unsafeMetadata?.subscription ||
    user.publicMetadata?.tier ||
    user.unsafeMetadata?.tier;

  if (raw && typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed.includes("premium")) return "Premium";
    if (trimmed.includes("pro")) return "Pro";
    if (trimmed.includes("basic")) return "Basic";
    if (trimmed.includes("free") || trimmed.includes("trial")) return "Free";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return "Free";
};

/**
 * Check if the user is currently on an active Premium plan
 */
export const isPremiumUser = (user, explicitPlan) => {
  if (globalPlanState.isLoaded) {
    return Boolean(globalPlanState.isPremium);
  }
  const plan = getUserPlan(user, explicitPlan).toLowerCase();
  return (
    plan === "premium" ||
    plan === "pro" ||
    plan === "enterprise" ||
    (plan !== "free" && plan !== "basic" && plan !== "trial")
  );
};

/**
 * React hook to access and automatically sync the verified Clerk Billing plan
 */
export const useUserPlan = () => {
  const { user } = useUser();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState(() => ({
    ...globalPlanState,
    plan: getUserPlan(user, globalPlanState.plan),
    isPremium:
      globalPlanState.isPremium || isPremiumUser(user, globalPlanState.plan),
  }));

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_BASE_URL ||
    "http://localhost:5000";

  const fetchPlan = useCallback(async () => {
    if (!isSignedIn) {
      setGlobalPlan({ plan: "Free", isPremium: false, freeUsage: 0 });
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${backendUrl}/api/user/profile`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const planName =
          data.isPremium || (data.plan && data.plan.toLowerCase() === "premium")
            ? "Premium"
            : "Free";
        const isPrem = planName === "Premium";

        setGlobalPlan({
          plan: planName,
          isPremium: isPrem,
          freeUsage: data.freeUsage || 0,
        });
      }
    } catch (err) {
      console.warn("Failed to fetch verified user plan:", err.message);
    }
  }, [backendUrl, getToken, isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchPlan();
    } else if (isLoaded && !isSignedIn) {
      setGlobalPlan({ plan: "Free", isPremium: false, freeUsage: 0 });
    }

    const listener = (newState) => setState(newState);
    listeners.add(listener);

    const handleFocus = () => {
      if (isSignedIn) {
        fetchPlan();
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isLoaded, isSignedIn, fetchPlan]);

  return {
    plan: state.plan,
    isPremium: state.isPremium,
    freeUsage: state.freeUsage,
    loading: !state.isLoaded,
    refreshPlan: fetchPlan,
  };
};
