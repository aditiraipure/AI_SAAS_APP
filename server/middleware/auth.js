import { clerkClient, getAuth } from "@clerk/express";
import "dotenv/config";
import User from "../models/userModel.js";

/**
 * Authentication Middleware using Clerk & Clerk Billing
 * Validates authenticated user, retrieves current billing plan from Clerk Billing / session claims,
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

    const claims = authData?.sessionClaims || req.auth?.sessionClaims || {};

    // 1. Check claims in JWT session token (Zero network latency)
    let detectedPlan = null;
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

    let userName =
      claims?.fullName ||
      claims?.full_name ||
      claims?.name ||
      [claims?.firstName || claims?.first_name, claims?.lastName || claims?.last_name]
        .filter(Boolean)
        .join(" ") ||
      claims?.username ||
      claims?.email?.split("@")[0] ||
      null;

    let userEmail =
      claims?.email ||
      claims?.email_address ||
      claims?.primary_email_address ||
      "";

    // 2. Fetch existing user record from local MongoDB database
    let dbUser = await User.findOne({ userId });

    // 3. Fallback to Clerk API only when required (e.g. brand new user onboarding or missing critical profile data)
    if (!dbUser || (!userName && !userEmail)) {
      try {
        const user = await clerkClient.users.getUser(userId);

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
          userName ||
          user?.fullName ||
          [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
          user?.username ||
          user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
          "QuickAI Creator";

        userEmail = userEmail || user?.emailAddresses?.[0]?.emailAddress || "";
      } catch (clerkError) {
        console.warn("Clerk user lookup error:", clerkError.message);
      }

      // Check Clerk Billing for new user if plan still not detected
      if (!detectedPlan && clerkClient.billing?.getUserBillingSubscription) {
        try {
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
        } catch (billingErr) {
          // Expected for free/unsubscribed users
        }
      }
    }

    // If still no detected plan, use plan from existing dbUser if available
    if (!detectedPlan && dbUser?.plan) {
      detectedPlan = dbUser.plan.toLowerCase().trim();
    }

    // Normalize detected plan
    const isDetectedPremium =
      detectedPlan === "premium" ||
      detectedPlan === "pro" ||
      detectedPlan === "enterprise";

    const normalizedPlan = isDetectedPremium ? "premium" : "free";
    userName = userName || dbUser?.name || "QuickAI Creator";

    // 4. Sync / retrieve user record in database
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
      if (detectedPlan && dbUser.plan.toLowerCase() !== normalizedPlan) {
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
