// components/Navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";

export default function Navbar() {
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const router = useRouter();
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShow(false); // scrolling down
      } else {
        setShow(true); // scrolling up
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (sectionId: string) => {
    if (isHomePage) {
      const element = document.getElementById(sectionId);
      if (element) {
        window.scrollTo({
          top: element.offsetTop - 100,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <motion.nav
      animate={{ y: show ? 0 : -100 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="bg-white/80 backdrop-blur-sm fixed top-0 w-full z-50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <span className="text-xl font-bold text-[#1D244F]">
            FloCareer
          </span>
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          {isHomePage ? (
            <>
            <Link href="/workflow" 
          className="hover:text-orange-500 
          transition">
            Workflow
          </Link>
              <button 
                onClick={() => scrollToSection("features")} 
                className="hover:text-[#f7a828] text-[#1D244F] transition"
              >
                AI Features
              </button>
              <button 
                onClick={() => scrollToSection("stats")} 
                className="hover:text-[#f7a828] text-[#1D244F] transition"
              >
                Stats
              </button>
              {/* <button 
                onClick={() => scrollToSection("workflow")} 
                className="hover:text-[#f7a828] text-[#1D244F] transition"
              >
                Workflow
              </button> */}
              <button 
                onClick={() => scrollToSection("services")} 
                className="hover:text-[#f7a828] text-[#1D244F] transition"
              >
                Services
              </button>
            </>
          ) : (
            <>
              <Link href="/" className="hover:text-[#f7a828] text-[#1D244F] transition">
                Home
              </Link>
              <Link href="/workflow" className="hover:text-[#f7a828] text-[#1D244F] transition">
                Workflow
              </Link>
            </>
          )}
        </div>
        <InteractiveHoverButton className="bg-[#f7a828] hover:bg-[#f7a828]/80 text-white" onClick={() => router.push("/jd-qna")}>
          Get Started
        </InteractiveHoverButton>
      </div>
    </motion.nav>
  );
}
