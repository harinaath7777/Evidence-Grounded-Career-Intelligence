import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Compass, Sparkles, Target, Wand2, Mic, Bot, Zap, Play } from "lucide-react";
import gsap from "gsap";

export default function Gsap3DHero() {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const robotRef = useRef(null);
  const tabletRef = useRef(null);
  const badge1Ref = useRef(null);
  const badge2Ref = useRef(null);
  const badge3Ref = useRef(null);
  const magnetBtnRef = useRef(null);
  const scoreCounterRef = useRef(null);

  const [counterValue, setCounterValue] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    const robot = robotRef.current;
    const tablet = tabletRef.current;
    const b1 = badge1Ref.current;
    const b2 = badge2Ref.current;
    const b3 = badge3Ref.current;

    if (!container || !card) return;

    // 1. Initial GSAP 3D Entrance Animation
    const tl = gsap.timeline({ defaults: { ease: "back.out(1.6)", duration: 0.9 } });

    tl.fromTo(
      card,
      { opacity: 0, y: 50, scale: 0.95, rotateX: 15 },
      { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.9 }
    )
      .fromTo(
        ".gsap-hero-badge",
        { opacity: 0, y: -20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.1, duration: 0.6 },
        "-=0.5"
      )
      .fromTo(
        tablet,
        { opacity: 0, scale: 0.8, rotateY: -20, z: -80 },
        { opacity: 1, scale: 1, rotateY: -4, z: 20, duration: 0.8 },
        "-=0.5"
      )
      .fromTo(
        robot,
        { opacity: 0, scale: 0.5, y: 60, rotateZ: -10 },
        { opacity: 1, scale: 1, y: 0, rotateZ: 0, duration: 1 },
        "-=0.6"
      )
      .fromTo(
        [b1, b2, b3].filter(Boolean),
        { opacity: 0, scale: 0, z: 50 },
        { opacity: 1, scale: 1, z: 40, stagger: 0.15, duration: 0.6 },
        "-=0.5"
      );

    // 2. Animated Counter for ATS Score
    const counterObj = { val: 0 };
    gsap.to(counterObj, {
      val: 98,
      duration: 2.2,
      ease: "power2.out",
      delay: 0.4,
      onUpdate: () => {
        setCounterValue(Math.round(counterObj.val));
      },
    });

    // 3. Continuous Organic Floating Physics for Robot Mascot
    const robotFloatTween = gsap.to(robot, {
      y: "-=18px",
      rotateZ: 2,
      duration: 2.8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    // Floating badges oscillation
    const badge1Float = gsap.to(b1, {
      y: "-=10px",
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 0.3,
    });
    const badge2Float = gsap.to(b2, {
      y: "+=12px",
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 0.7,
    });
    const badge3Float = gsap.to(b3, {
      y: "-=8px",
      duration: 2.1,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 0.5,
    });

    // 4. GSAP 3D Interactive Mouse Move Parallax
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const deltaX = (x - centerX) / centerX;
      const deltaY = (y - centerY) / centerY;

      // 3D Card Perspective Tilt
      gsap.to(card, {
        rotateY: deltaX * 8,
        rotateX: -deltaY * 8,
        transformPerspective: 1200,
        duration: 0.4,
        ease: "power1.out",
        overwrite: "auto",
      });

      // 3D Mascot Heads-Up Tracking
      gsap.to(robot, {
        x: deltaX * 24,
        y: deltaY * 20,
        rotateY: deltaX * 22,
        rotateX: -deltaY * 18,
        z: 40,
        duration: 0.35,
        ease: "power1.out",
        overwrite: "auto",
      });

      // 3D Tablet Tilt
      gsap.to(tablet, {
        x: deltaX * 12,
        y: deltaY * 10,
        rotateY: -4 + deltaX * 12,
        rotateX: -deltaY * 10,
        z: 20,
        duration: 0.4,
        ease: "power1.out",
        overwrite: "auto",
      });

      // 3D Floating Badges Deep Parallax
      gsap.to(b1, {
        x: deltaX * 36,
        y: deltaY * 28,
        z: 60,
        duration: 0.45,
        ease: "power2.out",
        overwrite: "auto",
      });

      gsap.to(b2, {
        x: deltaX * -28,
        y: deltaY * -22,
        z: 50,
        duration: 0.45,
        ease: "power2.out",
        overwrite: "auto",
      });

      gsap.to(b3, {
        x: deltaX * 30,
        y: deltaY * 34,
        z: 70,
        duration: 0.45,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });

      gsap.to(robot, {
        x: 0,
        y: 0,
        rotateY: 0,
        rotateX: 0,
        z: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });

      gsap.to(tablet, {
        x: 0,
        y: 0,
        rotateY: -4,
        rotateX: 0,
        z: 0,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });

      gsap.to([b1, b2, b3], {
        x: 0,
        y: 0,
        z: 30,
        duration: 0.8,
        ease: "elastic.out(1, 0.4)",
        overwrite: "auto",
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    // 5. Magnetic Button Effect (GSAP Style)
    const magnetBtn = magnetBtnRef.current;
    if (magnetBtn) {
      const onBtnMouseMove = (e) => {
        const rect = magnetBtn.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        gsap.to(magnetBtn, {
          x: x * 0.35,
          y: y * 0.35,
          rotateX: -y * 0.15,
          rotateY: x * 0.15,
          duration: 0.25,
          ease: "power2.out",
        });
      };

      const onBtnMouseLeave = () => {
        gsap.to(magnetBtn, {
          x: 0,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: "elastic.out(1.2, 0.4)",
        });
      };

      magnetBtn.addEventListener("mousemove", onBtnMouseMove);
      magnetBtn.addEventListener("mouseleave", onBtnMouseLeave);
    }

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      robotFloatTween.kill();
      badge1Float.kill();
      badge2Float.kill();
      badge3Float.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        perspective: "1400px",
        marginBottom: "36px",
        position: "relative",
      }}
    >
      <section
        ref={cardRef}
        className="welcome-banner"
        style={{
          transformStyle: "preserve-3d",
          position: "relative",
          margin: 0,
          transition: "box-shadow 0.3s ease",
          cursor: "default",
          overflow: "visible", // Enable 3D floating out of bounds!
        }}
      >
        {/* Left Copy Column */}
        <div className="banner-copy" style={{ transformStyle: "preserve-3d" }}>
          <div className="banner-badges-row">
            <span className="clay-pill-tag purple gsap-hero-badge">
              <Compass size={14} /> Career Path Explorer
            </span>
            <span className="clay-pill-tag orange gsap-hero-badge">
              <Sparkles size={14} /> AI Suggestions
            </span>
            <span className="clay-pill-tag teal gsap-hero-badge">
              <Target size={14} /> Resume Reviews
            </span>
          </div>

          <h2 style={{ transform: "translateZ(30px)" }}>
            AI Resume Builder<br />
            Let's Build Your Success Story!
          </h2>

          <p style={{ transform: "translateZ(20px)" }}>
            Powered by multi-step <strong>Agentic RAG</strong>, interactive 3D clay visuals, and turn-by-turn speech interview coaching.
          </p>

          <div
            style={{
              display: "flex",
              gap: "14px",
              flexWrap: "wrap",
              alignItems: "center",
              transform: "translateZ(40px)",
            }}
          >
            <div ref={magnetBtnRef} style={{ display: "inline-block" }}>
              <Link to="/upload" className="button button-primary">
                <Wand2 size={17} /> Analyze your resume <ArrowUpRight size={16} />
              </Link>
            </div>

            <Link
              to="/upload"
              className="button button-orange"
              style={{
                boxShadow: "var(--btn-orange-shadow)",
              }}
            >
              <Zap size={16} /> Instant 3D Score
            </Link>
          </div>
        </div>

        {/* Right 3D Interactive Stage with GSAP Parallax Layers */}
        <div
          className="banner-hero-art"
          style={{
            transformStyle: "preserve-3d",
            position: "relative",
            minHeight: "260px",
          }}
        >
          {/* Layer 1: 3D Clay Tablet */}
          <div
            ref={tabletRef}
            style={{
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <img
              src="/clay-resume-hero.png"
              alt="3D Clay Resume Tablet"
              className="banner-clipboard-img"
            />
          </div>

          {/* Layer 2: 3D Robot Mascot */}
          <div
            ref={robotRef}
            className="banner-robot-container"
            style={{
              transformStyle: "preserve-3d",
              willChange: "transform",
            }}
          >
            <img
              src="/clay-robot-mascot.png"
              alt="3D Clay Robot Assistant"
              className="banner-robot-img"
            />
            <div className="robot-speech-pill" style={{ transform: "translateZ(25px)" }}>
              🤖 "Hover &amp; move your mouse!"
            </div>
          </div>

          {/* Layer 3: Floating 3D Pill Badge 1 (ATS Score) */}
          <div
            ref={badge1Ref}
            style={{
              position: "absolute",
              top: "-16px",
              right: "12px",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: "9999px",
              fontFamily: "var(--font-display)",
              fontWeight: "800",
              fontSize: "12px",
              boxShadow: "0 12px 24px -2px rgba(16, 185, 129, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              zIndex: 10,
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <Zap size={14} /> ATS Score: {counterValue}%
          </div>

          {/* Layer 4: Floating 3D Pill Badge 2 (Speech Voice) */}
          <div
            ref={badge2Ref}
            style={{
              position: "absolute",
              bottom: "-14px",
              left: "-18px",
              background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: "9999px",
              fontFamily: "var(--font-display)",
              fontWeight: "800",
              fontSize: "12px",
              boxShadow: "0 12px 24px -2px rgba(124, 58, 237, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              zIndex: 10,
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <Mic size={14} /> 10 Voice Qs Ready
          </div>

          {/* Layer 5: Floating 3D Pill Badge 3 (Agentic RAG) */}
          <div
            ref={badge3Ref}
            style={{
              position: "absolute",
              top: "40%",
              right: "-24px",
              background: "linear-gradient(135deg, #FF7849 0%, #EA580C 100%)",
              color: "#FFFFFF",
              padding: "8px 14px",
              borderRadius: "9999px",
              fontFamily: "var(--font-display)",
              fontWeight: "800",
              fontSize: "11px",
              boxShadow: "0 12px 24px -2px rgba(234, 88, 12, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              zIndex: 10,
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <Bot size={13} /> Multi-Step RAG
          </div>
        </div>
      </section>
    </div>
  );
}
