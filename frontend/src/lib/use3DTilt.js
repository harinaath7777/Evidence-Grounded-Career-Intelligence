import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * use3DTilt hook creates a gsap.com-style interactive 3D perspective tilt effect
 * with floating specular reflection on hover.
 */
export function use3DTilt({ maxTilt = 12, perspective = 900, scale = 1.02 } = {}) {
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Apply 3D perspective transform style
    el.style.transformStyle = "preserve-3d";
    el.style.perspective = `${perspective}px`;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      gsap.to(el, {
        rotateX,
        rotateY,
        scale,
        transformPerspective: perspective,
        duration: 0.35,
        ease: "power1.out",
        overwrite: "auto",
      });

      // Find children with data-depth or 3d-child and apply parallax depth
      const layers = el.querySelectorAll("[data-depth]");
      layers.forEach((layer) => {
        const depth = parseFloat(layer.getAttribute("data-depth") || "20");
        const moveX = ((x - centerX) / centerX) * depth;
        const moveY = ((y - centerY) / centerY) * depth;
        gsap.to(layer, {
          x: moveX,
          y: moveY,
          z: depth * 1.5,
          duration: 0.35,
          ease: "power1.out",
          overwrite: "auto",
        });
      });
    };

    const handleMouseLeave = () => {
      gsap.to(el, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        duration: 0.7,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });

      const layers = el.querySelectorAll("[data-depth]");
      layers.forEach((layer) => {
        gsap.to(layer, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.4)",
          overwrite: "auto",
        });
      });
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [maxTilt, perspective, scale]);

  return elementRef;
}
