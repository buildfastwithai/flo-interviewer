// components/Navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";

export default function Navbar() {
  const [show, setShow] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  return (
    <motion.nav
      animate={{ y: show ? 0 : -100 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="bg-transparent fixed top-0 w-full z-50"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            Flocareer
          </span>
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <Link href="#workflow" className="hover:text-orange-500 transition">
            Workflow
          </Link>
          <Link href="#features" className="hover:text-orange-500 transition">
            Features
          </Link>
          <Link href="#stats" className="hover:text-orange-500 transition">
            Stats
          </Link>
        </div>
        <InteractiveHoverButton className="bg-orange-500 hover:bg-orange-600">
          Request Demo
        </InteractiveHoverButton>
      </div>
    </motion.nav>
  );
}
