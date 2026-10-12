import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function GsapCursor() {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);

  useEffect(() => {
    // Check if device supports fine hover (desktop/mouse)
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const cursor = cursorRef.current;
    const follower = followerRef.current;
    if (!cursor || !follower) return;

    // quickTo for ultra-performant 60fps cursor trailing
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.1, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.1, ease: "power3" });
    const fXTo = gsap.quickTo(follower, "x", { duration: 0.35, ease: "power2.out" });
    const fYTo = gsap.quickTo(follower, "y", { duration: 0.35, ease: "power2.out" });

    const onMouseMove = (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
      fXTo(e.clientX);
      fYTo(e.clientY);
    };

    const onMouseEnterInteractive = () => {
      gsap.to(cursor, { scale: 0.5, duration: 0.2, ease: "power2.out" });
      gsap.to(follower, {
        scale: 2.2,
        backgroundColor: "rgba(124, 58, 237, 0.15)",
        borderColor: "rgba(124, 58, 237, 0.6)",
        duration: 0.25,
        ease: "back.out(2)"
      });
    };

    const onMouseLeaveInteractive = () => {
      gsap.to(cursor, { scale: 1, duration: 0.2, ease: "power2.out" });
      gsap.to(follower, {
        scale: 1,
        backgroundColor: "transparent",
        borderColor: "rgba(124, 58, 237, 0.4)",
        duration: 0.25,
        ease: "power2.out"
      });
    };

    const onMouseDown = () => {
      gsap.to(follower, { scale: 0.85, duration: 0.15, ease: "power2.in" });
    };

    const onMouseUp = () => {
      gsap.to(follower, { scale: 1, duration: 0.25, ease: "back.out(2)" });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    // Attach listeners to interactive elements
    const attachHoverHandlers = () => {
      const interactives = document.querySelectorAll("a, button, input, textarea, .stat-card, .resume-card, .clay-pill-tag");
      interactives.forEach((el) => {
        el.addEventListener("mouseenter", onMouseEnterInteractive);
        el.addEventListener("mouseleave", onMouseLeaveInteractive);
      });
    };

    attachHoverHandlers();
    const observer = new MutationObserver(attachHoverHandlers);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "8px",
          height: "8px",
          backgroundColor: "var(--clay-purple, #7C3AED)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          transform: "translate(-50%, -50%)",
        }}
      />
      <div
        ref={followerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "36px",
          height: "36px",
          border: "2px solid rgba(124, 58, 237, 0.4)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9998,
          transform: "translate(-50%, -50%)",
          transition: "border-color 0.2s, background-color 0.2s",
        }}
      />
    </>
  );
}
