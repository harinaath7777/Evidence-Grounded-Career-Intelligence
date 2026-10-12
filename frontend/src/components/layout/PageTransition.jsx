import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";

export default function PageTransition({ children }) {
  const location = useLocation();
  const pageRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    const page = pageRef.current;
    const bar = progressBarRef.current;
    if (!page) return;

    // Scroll to top immediately on route switch
    window.scrollTo(0, 0);

    // 1. Top Kinetic Route Progress Indicator
    if (bar) {
      gsap.fromTo(
        bar,
        { width: "0%", opacity: 1 },
        {
          width: "100%",
          duration: 0.45,
          ease: "power2.out",
          onComplete: () => {
            gsap.to(bar, { opacity: 0, duration: 0.25, delay: 0.1 });
          },
        }
      );
    }

    // 2. 3D Page Unfold & Entrance
    gsap.fromTo(
      page,
      {
        opacity: 0,
        y: 28,
        scale: 0.985,
        rotateX: 4,
        transformPerspective: 1200,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        duration: 0.5,
        ease: "power3.out",
        clearProps: "transform,rotateX,scale",
      }
    );
  }, [location.pathname]);

  return (
    <>
      {/* Top Routing Progress Bar */}
      <div
        ref={progressBarRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "3.5px",
          width: "0%",
          background: "linear-gradient(90deg, var(--clay-purple, #7C3AED) 0%, var(--clay-orange, #FF6B4A) 50%, var(--clay-teal, #0D9488) 100%)",
          zIndex: 10000,
          pointerEvents: "none",
          boxShadow: "0 2px 10px rgba(124, 58, 237, 0.4)",
        }}
      />
      <div
        ref={pageRef}
        style={{
          transformStyle: "preserve-3d",
          width: "100%",
          minHeight: "100%",
        }}
      >
        {children}
      </div>
    </>
  );
}
