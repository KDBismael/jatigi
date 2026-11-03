import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ProductShowcase } from "@/components/landing/product-showcase";
import { FeaturesSection } from "@/components/landing/features-section";
import { Testimonial } from "@/components/landing/testimonial";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { StickyMobileCta } from "@/components/landing/sticky-mobile-cta";
import { LandingTracking } from "@/components/landing/landing-tracking";
import s from "@/components/landing/landing.module.css";
import { TrackView } from "@/components/analytics/track-view";
export default function LandingPage() {
  return (
    <div data-testid="landing-page" className={s.root}>
      <LandingTracking />
      <TrackView event="landing_view" withSource />
      <LandingNav />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionSection />
        <HowItWorks />
        <ProductShowcase />
        <FeaturesSection />
        <Testimonial />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
      <StickyMobileCta />
    </div>
  );
}
