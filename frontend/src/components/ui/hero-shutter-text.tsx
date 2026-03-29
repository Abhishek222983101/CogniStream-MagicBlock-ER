"use client";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface HeroTextProps {
  text?: string;
  className?: string;
}

export default function HeroText({
  text = "COGNISTREAM",
  className = "",
}: HeroTextProps) {
  const [count, setCount] = useState(0);
  const characters = text.split("");

  return (
    <div
      className={`relative flex flex-col items-start justify-center w-full bg-transparent transition-colors duration-700 ${className}`}
    >
      <div className="relative z-10 w-full flex flex-col items-start">
        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            className="flex flex-nowrap justify-start items-center w-full"
          >
            {characters.map((char, i) => (
              <div
                key={i}
                className="relative overflow-hidden group"
              >
                {/* Main Character - Charcoal */}
                <motion.span
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ delay: i * 0.04 + 0.3, duration: 0.8 }}
                  className="text-[11vw] sm:text-[9.5vw] md:text-[6.5vw] lg:text-[4.5vw] leading-none font-heading font-black uppercase text-charcoal drop-shadow-[2px_2px_0px_rgba(15,15,15,0.2)] tracking-tighter"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>

                {/* Top Slice Layer - Cobalt */}
                <motion.span
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: "100%", opacity: [0, 1, 0] }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.04,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 text-[11vw] sm:text-[9.5vw] md:text-[6.5vw] lg:text-[4.5vw] leading-none font-heading font-black uppercase text-cobalt z-10 pointer-events-none drop-shadow-[2px_2px_0px_rgba(15,15,15,0.5)] tracking-tighter"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 35%, 0 35%)" }}
                >
                  {char}
                </motion.span>

                {/* Middle Slice Layer - Paper */}
                <motion.span
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: "-100%", opacity: [0, 1, 0] }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.04 + 0.1,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 text-[11vw] sm:text-[9.5vw] md:text-[6.5vw] lg:text-[4.5vw] leading-none font-heading font-black uppercase text-paper z-10 pointer-events-none drop-shadow-[2px_2px_0px_rgba(15,15,15,0.5)] tracking-tighter"
                  style={{
                    clipPath: "polygon(0 35%, 100% 35%, 100% 65%, 0 65%)",
                  }}
                >
                  {char}
                </motion.span>

                {/* Bottom Slice Layer - Surgical Green */}
                <motion.span
                  initial={{ x: "-100%", opacity: 0 }}
                  animate={{ x: "100%", opacity: [0, 1, 0] }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.04 + 0.2,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 text-[11vw] sm:text-[9.5vw] md:text-[6.5vw] lg:text-[4.5vw] leading-none font-heading font-black uppercase text-surgical z-10 pointer-events-none drop-shadow-[2px_2px_0px_rgba(15,15,15,0.5)] tracking-tighter"
                  style={{
                    clipPath: "polygon(0 65%, 100% 65%, 100% 100%, 0 100%)",
                  }}
                >
                  {char}
                </motion.span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute top-0 -right-12 md:-right-16 z-20">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCount((c) => c + 1)}
          className="p-2 md:p-3 bg-charcoal text-white border-brutal shadow-brutal-sm hover:bg-cobalt hover:text-white transition-colors duration-300 hidden sm:flex items-center justify-center"
          title="Replay Animation"
        >
          <RefreshCw size={20} strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
}
