import { clerkClient, getAuth } from "@clerk/express";
import "dotenv/config";
import User from "../models/userModel.js";

/**
 * Authentication Middleware using Clerk & Clerk Billing
 * Validates authenticated user, retrieves current billing plan from Clerk Billing,
 * syncs user profile and subscription with MongoDB, and enforces plan-based access.
 */
export const auth = async (req, res, next) => {
  try {
    let authData = null;
    try {
      authData = getAuth(req);
    } catch {
      authData = req.auth || null;
    }
    const userId = authData?.userId || req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in to access this feature.",
      });
    }

    let detectedPlan = null;
    let userName = "QuickAI Creator";
    let userEmail = "";

    // 1. Get real subscription from Clerk Billing (Clerk Source of Truth)
    try {
      if (clerkClient.billing?.getUserBillingSubscription) {
        const billingSub =
          await clerkClient.billing.getUserBillingSubscription(userId);
        if (billingSub && billingSub.status === "active") {
          const activeItem = billingSub.subscriptionItems?.find(
            (item) => item.status === "active",
          );
          const planSlug =
            activeItem?.plan?.slug?.toLowerCase() ||
            activeItem?.plan?.name?.toLowerCase();

          if (planSlug) {
            detectedPlan = planSlug.trim();
          }
        }
      }
    } catch (billingErr) {
      // 404 or no active subscription -> expected for free users
    }

    // 2. Check claims in JWT session token as secondary fallback
    if (!detectedPlan) {
      const claims = authData?.sessionClaims || req.auth?.sessionClaims || {};
      const claimPlan =
        claims?.plan ||
        claims?.metadata?.plan ||
        claims?.publicMetadata?.plan ||
        claims?.unsafeMetadata?.plan ||
        claims?.subscription ||
        claims?.tier;

      if (claimPlan && typeof claimPlan === "string") {
        detectedPlan = claimPlan.toLowerCase().trim();
      }
    }

    // 3. Fetch user details from Clerk API
    try {
      const user = await clerkClient.users.getUser(userId);
      req.user = user;

      if (!detectedPlan) {
        const clerkPlan =
          user?.publicMetadata?.plan ||
          user?.unsafeMetadata?.plan ||
          user?.privateMetadata?.plan ||
          user?.publicMetadata?.subscription ||
          user?.unsafeMetadata?.subscription ||
          user?.publicMetadata?.tier ||
          user?.unsafeMetadata?.tier;

        if (clerkPlan && typeof clerkPlan === "string") {
          detectedPlan = clerkPlan.toLowerCase().trim();
        }
      }

      userName =
        user?.fullName ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.username ||
        user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
        "QuickAI Creator";

      userEmail = user?.emailAddresses?.[0]?.emailAddress || "";
    } catch (clerkError) {
      console.warn("Clerk user lookup error:", clerkError.message);
    }

    // Normalize detected plan
    const isDetectedPremium =
      detectedPlan === "premium" ||
      detectedPlan === "pro" ||
      detectedPlan === "enterprise";

    const normalizedPlan = isDetectedPremium ? "premium" : "free";

    // 4. Sync / retrieve user record in database
    let dbUser = await User.findOne({ userId });

    if (!dbUser) {
      const uniqueUsername = `${userId}_${Date.now()}`;
      dbUser = await User.create({
        userId,
        name: userName,
        username: uniqueUsername,
        email: userEmail,
        plan: normalizedPlan,
        freeUsage: 0,
      });
    } else {
      let needsSave = false;
      if (dbUser.plan.toLowerCase() !== normalizedPlan) {
        dbUser.plan = normalizedPlan;
        needsSave = true;
      }
      if (
        userName &&
        dbUser.name !== userName &&
        userName !== "QuickAI Creator"
      ) {
        dbUser.name = userName;
        needsSave = true;
      }
      if (needsSave) {
        await dbUser.save();
      }
    }

    const currentPlan = (
      dbUser?.plan ||
      normalizedPlan ||
      "free"
    ).toLowerCase();
    const isPremium =
      currentPlan === "premium" ||
      currentPlan === "pro" ||
      currentPlan === "enterprise" ||
      (currentPlan !== "free" &&
        currentPlan !== "basic" &&
        currentPlan !== "trial");

    // Attach user, name, and plan information to request object
    req.userId = userId;
    req.userName = userName || dbUser?.name || "QuickAI Creator";
    req.plan = isPremium ? "premium" : "free";
    req.isPremium = isPremium;
    req.dbUser = dbUser;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed. Invalid or expired session.",
    });
  }
};

export const planMiddleware = auth;
export default auth;
