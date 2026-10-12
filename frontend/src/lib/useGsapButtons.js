import { useEffect } from "react";
import gsap from "gsap";

/**
 * useGsapButtons attaches distinct GSAP physics micro-interactions to different button variants:
 * 1. .button-primary: Magnetic spring pull & squash bounce
 * 2. .button-orange: Jelly wobble & pulse ring
 * 3. .button-secondary: 3D perspective tilt & specular glare sweep
 * 4. .mini-action / .text-link: Kinetic icon rocket launch & letter-spacing pop
 * 5. .icon-button: 3D pop & elastic spin
 */
export function useGsapButtons() {
  useEffect(() => {
    // Only enable mouse physics on non-touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const cleanupFns = [];

    // Helper to register listeners
    const register = (el, event, handler) => {
      el.addEventListener(event, handler);
      cleanupFns.push(() => el.removeEventListener(event, handler));
    };

    const attachButtonEffects = () => {
      // 1. MAGNETIC SPRING PULL on .button-primary & .btn-magnetic
      const magneticButtons = document.querySelectorAll(".button-primary:not([data-gsap-bound]), .btn-magnetic:not([data-gsap-bound])");
      magneticButtons.forEach((btn) => {
        btn.setAttribute("data-gsap-bound", "magnetic");
        btn.style.transformStyle = "preserve-3d";
        btn.style.willChange = "transform";

        const onMouseMove = (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - (rect.left + rect.width / 2);
          const y = e.clientY - (rect.top + rect.height / 2);
          gsap.to(btn, {
            x: x * 0.35,
            y: y * 0.35,
            rotateX: -y * 0.15,
            rotateY: x * 0.15,
            scale: 1.04,
            duration: 0.25,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        const onMouseLeave = () => {
          gsap.to(btn, {
            x: 0,
            y: 0,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 0.65,
            ease: "elastic.out(1.2, 0.35)",
            overwrite: "auto",
          });
        };

        const onMouseDown = () => {
          gsap.to(btn, { scaleX: 1.08, scaleY: 0.9, duration: 0.12, ease: "power2.in" });
        };

        const onMouseUp = () => {
          gsap.to(btn, { scaleX: 1, scaleY: 1, duration: 0.45, ease: "elastic.out(1.5, 0.3)" });
        };

        register(btn, "mousemove", onMouseMove);
        register(btn, "mouseleave", onMouseLeave);
        register(btn, "mousedown", onMouseDown);
        register(btn, "mouseup", onMouseUp);
      });

      // 2. JELLY WOBBLE on .button-orange & .btn-jelly
      const jellyButtons = document.querySelectorAll(".button-orange:not([data-gsap-bound]), .btn-jelly:not([data-gsap-bound])");
      jellyButtons.forEach((btn) => {
        btn.setAttribute("data-gsap-bound", "jelly");
        btn.style.willChange = "transform";

        const onMouseEnter = () => {
          gsap.fromTo(
            btn,
            { scaleX: 1, scaleY: 1 },
            {
              keyframes: [
                { scaleX: 1.14, scaleY: 0.86, duration: 0.12, ease: "power2.out" },
                { scaleX: 0.9, scaleY: 1.1, duration: 0.14, ease: "power2.inOut" },
                { scaleX: 1.06, scaleY: 0.95, duration: 0.12, ease: "power2.out" },
                { scaleX: 0.98, scaleY: 1.02, duration: 0.1, ease: "power2.inOut" },
                { scaleX: 1, scaleY: 1, duration: 0.15, ease: "power1.out" },
              ],
              overwrite: "auto",
            }
          );
        };

        register(btn, "mouseenter", onMouseEnter);
      });

      // 3. 3D GYRO TILT on .button-secondary & .btn-tilt
      const tiltButtons = document.querySelectorAll(".button-secondary:not([data-gsap-bound]), .button-white:not([data-gsap-bound])");
      tiltButtons.forEach((btn) => {
        btn.setAttribute("data-gsap-bound", "tilt");
        btn.style.transformStyle = "preserve-3d";
        btn.style.perspective = "600px";

        const onMouseMove = (e) => {
          const rect = btn.getBoundingClientRect();
          const x = e.clientX - (rect.left + rect.width / 2);
          const y = e.clientY - (rect.top + rect.height / 2);
          gsap.to(btn, {
            rotateX: -y * 0.25,
            rotateY: x * 0.25,
            scale: 1.03,
            z: 10,
            duration: 0.2,
            ease: "power1.out",
            overwrite: "auto",
          });
        };

        const onMouseLeave = () => {
          gsap.to(btn, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            z: 0,
            duration: 0.5,
            ease: "elastic.out(1, 0.4)",
            overwrite: "auto",
          });
        };

        register(btn, "mousemove", onMouseMove);
        register(btn, "mouseleave", onMouseLeave);
      });

      // 4. KINETIC ICON LAUNCH on .mini-action & .text-link
      const kineticButtons = document.querySelectorAll(".mini-action:not([data-gsap-bound]), .text-link:not([data-gsap-bound])");
      kineticButtons.forEach((btn) => {
        btn.setAttribute("data-gsap-bound", "kinetic");
        const icon = btn.querySelector("svg, span");

        const onMouseEnter = () => {
          if (icon) {
            gsap.to(icon, {
              x: 5,
              y: -2,
              scale: 1.25,
              rotate: 15,
              duration: 0.25,
              ease: "back.out(2)",
              overwrite: "auto",
            });
          }
        };

        const onMouseLeave = () => {
          if (icon) {
            gsap.to(icon, {
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
              duration: 0.4,
              ease: "power2.out",
              overwrite: "auto",
            });
          }
        };

        register(btn, "mouseenter", onMouseEnter);
        register(btn, "mouseleave", onMouseLeave);
      });

      // 5. 3D POP & SPIN on .icon-button
      const iconButtons = document.querySelectorAll(".icon-button:not([data-gsap-bound])");
      iconButtons.forEach((btn) => {
        btn.setAttribute("data-gsap-bound", "spin");

        const onMouseEnter = () => {
          gsap.to(btn, {
            scale: 1.2,
            rotateZ: 12,
            y: -2,
            duration: 0.25,
            ease: "back.out(2.2)",
            overwrite: "auto",
          });
        };

        const onMouseLeave = () => {
          gsap.to(btn, {
            scale: 1,
            rotateZ: 0,
            y: 0,
            duration: 0.45,
            ease: "elastic.out(1.2, 0.4)",
            overwrite: "auto",
          });
        };

        register(btn, "mouseenter", onMouseEnter);
        register(btn, "mouseleave", onMouseLeave);
      });
    };

    attachButtonEffects();

    // Observe DOM mutations to bind new buttons dynamically
    const observer = new MutationObserver(attachButtonEffects);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cleanupFns.forEach((fn) => fn());
      observer.disconnect();
    };
  }, []);
}
