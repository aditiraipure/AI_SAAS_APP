import { PricingTable, useUser } from "@clerk/react";
import { useEffect, useRef } from "react";

const Plan = () => {
  const { user } = useUser();
  const containerRef = useRef(null);

  // Dynamically detect user's active subscription if stored in metadata
  const userPlan =
    user?.publicMetadata?.plan ||
    user?.unsafeMetadata?.plan ||
    user?.publicMetadata?.subscription ||
    user?.unsafeMetadata?.subscription;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateButtons = () => {
      if (!containerRef.current) return;

      // Find all pricing cards rendered by Clerk
      const cards = containerRef.current.querySelectorAll(
        ".cl-pricingTableCard, .cl-pricingPlan, [data-clerk-pricing-card], .cl-card",
      );

      cards.forEach((card) => {
        const text = card.textContent?.toLowerCase() || "";
        const isCurrentByClerk =
          card.classList.contains("cl-pricingTableCard--current") ||
          card.classList.contains("cl-pricingPlan--current") ||
          card.querySelector(".cl-pricingTableCard__currentBadge") !== null ||
          card.querySelector("[data-current-plan='true']") !== null ||
          card.getAttribute("data-is-current") === "true" ||
          text.includes("current plan") ||
          text.includes("active plan");

        const isCurrentByMetadata =
          userPlan &&
          typeof userPlan === "string" &&
          text.includes(userPlan.toLowerCase());

        const isCurrentPlan = isCurrentByClerk || isCurrentByMetadata;

        // Find the subscribe / CTA button in this card
        const subscribeBtn = card.querySelector(
          ".cl-pricingTableCard__ctaButton, .cl-pricingPlan__ctaButton, button.cl-button, button",
        );

        if (subscribeBtn) {
          const btnText = subscribeBtn.textContent?.toLowerCase() || "";
          if (
            isCurrentPlan &&
            (btnText.includes("subscribe") ||
              btnText.includes("get started") ||
              btnText.includes("upgrade") ||
              btnText.includes("current"))
          ) {
            subscribeBtn.style.display = "none";
          }
        }
      });
    };

    // Initial run
    updateButtons();

    // Observe DOM changes inside the container to handle Clerk's async rendering
    const observer = new MutationObserver(updateButtons);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => observer.disconnect();
  }, [user, userPlan]);

  return (
    <div className="px-4 sm:px-20 xl:px-32 py-24">
      <div className="text-center">
        <h2 className="text-slate-700 text-[42px] font-semibold">
          Choose Your Plan
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto mt-2">
          Start for free and scale up as you grow. Find the perfect plan for
          your content creation needs.
        </p>
      </div>
      <div
        ref={containerRef}
        className="mt-14 max-w-3xl mx-auto flex justify-center [&_.cl-pricingTable]:max-w-3xl [&_.cl-pricingTable]:gap-5 [&_.cl-pricingTableCard]:max-w-[280px] [&_.cl-pricingPlan]:max-w-[280px] [&_.cl-pricingTableCard--current_.cl-pricingTableCard__ctaButton]:hidden [&_.cl-pricingPlan--current_.cl-pricingPlan__ctaButton]:hidden"
      >
        <PricingTable
          appearance={{
            elements: {
              rootBox: "w-full max-w-3xl mx-auto",
              pricingTable: "w-full justify-center gap-5",
              pricingTableCard: "max-w-[280px] w-full shadow-sm rounded-2xl",
              pricingPlan: "max-w-[280px] w-full shadow-sm rounded-2xl",
              pricingPlanCurrentCTAButton: "hidden",
              pricingTableCardCurrentCTAButton: "hidden",
            },
          }}
        />
      </div>
    </div>
  );
};

export default Plan;
