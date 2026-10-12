import { useRef } from "react";
import gsap from "gsap";

export default function Gsap3DCard({ children, className = "", style = {}, maxTilt = 10, scale = 1.025, ...props }) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    gsap.to(card, {
      rotateX,
      rotateY,
      scale,
      transformPerspective: 900,
      duration: 0.3,
      ease: "power2.out",
      overwrite: "auto",
    });

    if (glare) {
      gsap.to(glare, {
        opacity: 0.22,
        background: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.9) 0%, transparent 65%)`,
        duration: 0.2,
      });
    }

    // Elevate any 3D child
    const innerIcons = card.querySelectorAll(".stat-icon, .document-icon, .status-pill, svg");
    if (innerIcons.length > 0) {
      gsap.to(innerIcons, {
        z: 20,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card) return;

    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.45)",
      overwrite: "auto",
    });

    if (glare) {
      gsap.to(glare, { opacity: 0, duration: 0.4 });
    }

    const innerIcons = card.querySelectorAll(".stat-icon, .document-icon, .status-pill, svg");
    if (innerIcons.length > 0) {
      gsap.to(innerIcons, { z: 0, duration: 0.6, ease: "elastic.out(1, 0.45)" });
    }
  };

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: "preserve-3d",
        position: "relative",
        willChange: "transform",
        ...style,
      }}
      {...props}
    >
      {/* Specular Glare Overlay */}
      <div
        ref={glareRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          pointerEvents: "none",
          opacity: 0,
          zIndex: 5,
          mixBlendMode: "overlay",
          transition: "opacity 0.2s ease",
        }}
      />
      {children}
    </div>
  );
}
