"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: {
    regular: string;
    gradient: string;
  };
  description?: string;
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: React.MouseEventHandler<HTMLAnchorElement>;
  bottomImage?: {
    light: string;
    dark: string;
  };
  gridOptions?: {
    angle?: number;
    cellSize?: number;
    opacity?: number;
    lightLineColor?: string;
    darkLineColor?: string;
  };
}

/*
 * Small local className helper.
 * This avoids requiring "@/lib/utils" or any extra package.
 */
const cn = (
  ...classes: Array<string | false | null | undefined>
): string => {
  return classes.filter(Boolean).join(" ");
};

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "gray",
  darkLineColor = "gray",
}: {
  angle?: number;
  cellSize?: number;
  opacity?: number;
  lightLineColor?: string;
  darkLineColor?: string;
}) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  } as React.CSSProperties;

  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden",
        "perspective-[200px]",
        "opacity-(--opacity)"
      )}
      style={gridStyles}
      aria-hidden="true"
    >
      <div className="absolute inset-0 transform-[rotateX(var(--grid-angle))]">
        <div
          className={cn(
            "absolute h-[300vh] w-[600vw] ml-[-200%]",
            "origin-[100%_0_0]",
            "bg-[linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)]",
            "bg-repeat",
            "bg-size-[var(--cell-size)_var(--cell-size)]",
            "dark:bg-[linear-gradient(to_right,var(--dark-line)_1px,transparent_0),linear-gradient(to_bottom,var(--dark-line)_1px,transparent_0)]"
          )}
        />
      </div>

      <div className="absolute inset-0 bg-linear-to-t from-[#050507] via-[#050507]/45 to-transparent" />
    </div>
  );
};

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  (
    {
      className,
      title = "AI Video Director Agent",
      subtitle = {
        regular: "Turn raw footage into ",
        gradient: "scroll-stopping reels.",
      },
      description = "Let AI analyze your footage, build the edit plan, add overlays, and prepare your final vertical video automatically.",
      ctaText = "Get Started",
      ctaHref = "#",
      onCtaClick,
      bottomImage,
      gridOptions,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("relative min-h-screen bg-[#050507]", className)}
        {...props}
      >
        {/* Purple glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-screen w-[120vw] -translate-x-1/2 bg-[radial-gradient(ellipse_30%_70%_at_50%_-20%,rgba(124,58,237,0.34),rgba(255,255,255,0))]" />

        <section className="relative z-1 mx-auto max-w-full">
          <RetroGrid {...gridOptions} />

          <div className="relative z-10 mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-28 lg:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <div className="space-y-6">
                {/* Small title badge */}
                <h1 className="mx-auto inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/60 shadow-2xl shadow-purple-950/20 backdrop-blur-xl transition hover:border-white/15 hover:text-white/80">
                  {title}

                  <ChevronRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </h1>

                {/* Main heading */}
                <h2 className="mx-auto bg-clip-text text-4xl font-semibold tracking-tighter text-white sm:text-6xl lg:text-7xl">
                  {subtitle.regular}

                  <span className="bg-linear-to-r from-purple-300 via-fuchsia-300 to-pink-200 bg-clip-text text-transparent">
                    {subtitle.gradient}
                  </span>
                </h2>

                {/* Description */}
                <p className="mx-auto max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                  {description}
                </p>

                {/* CTA */}
                <div className="flex items-center justify-center pt-2">
                  <span className="relative inline-flex overflow-hidden rounded-full p-[1.5px]">
                    <span className="absolute inset-[-1000%] animate-[spin_2.4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#F472B6_75%,#E2CBFF_100%)]" />

                    <span className="relative inline-flex rounded-full bg-[#0a0a0f] p-0.5 backdrop-blur-3xl">
                      <a
                        href={ctaHref}
                        onClick={onCtaClick}
                        className="group inline-flex min-w-37 items-center justify-center rounded-full bg-linear-to-tr from-white/10 via-purple-400/16 to-transparent px-7 py-3.5 text-sm font-semibold text-white shadow-xl shadow-purple-950/25 transition hover:from-white/15 hover:via-purple-400/24"
                      >
                        {ctaText}

                        <ChevronRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </a>
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Optional preview image */}
            {bottomImage && (
              <div className="relative z-10 mx-auto mt-20 max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/2 p-1.5 shadow-2xl shadow-purple-950/20">
                <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/40">
                  <img
                    src={bottomImage.light}
                    className="block aspect-16/8 w-full object-cover opacity-90 dark:hidden"
                    alt="AI video editing workspace preview"
                  />

                  <img
                    src={bottomImage.dark}
                    className="hidden aspect-16/8 w-full object-cover opacity-85 dark:block"
                    alt="AI video editing workspace preview"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }
);

HeroSection.displayName = "HeroSection";

export { HeroSection };