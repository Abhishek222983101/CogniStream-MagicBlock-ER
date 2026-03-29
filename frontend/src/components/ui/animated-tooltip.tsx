"use client";

import React, { useState } from "react";
import { motion, useTransform, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

export type TooltipItem = {
  id: number;
  name: string;
  designation: string;
  image: string;
};

interface AnimatedTooltipProps {
  items: TooltipItem[];
  className?: string;
}

const TooltipItemComponent = ({ item }: { item: TooltipItem }) => {
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  
  const rotate = useSpring(useTransform(x, [-100, 100], [-15, 15]), {
    stiffness: 200,
    damping: 20,
  });
  
  const translateX = useSpring(useTransform(x, [-100, 100], [-30, 30]), {
    stiffness: 200,
    damping: 20,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    x.set(e.clientX - rect.left - centerX);
  };

  return (
    <div 
      className="group relative -ml-3 first:ml-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brutalist Tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          y: isHovered ? 0 : 10,
          scale: isHovered ? 1 : 0.9,
        }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ translateX, rotate }}
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex flex-col items-center bg-charcoal border-2 border-charcoal px-4 py-2 shadow-brutal">
          <p className="whitespace-nowrap text-sm font-heading font-bold text-paper uppercase tracking-wide">
            {item.name}
          </p>
          <p className="whitespace-nowrap text-xs font-mono text-paper/60">
            {item.designation}
          </p>
          {/* Brutalist triangle pointer */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-charcoal" />
        </div>
      </motion.div>
      
      {/* Avatar Image */}
      <motion.img
        onMouseMove={handleMouseMove}
        src={item.image}
        alt={item.name}
        width={48}
        height={48}
        whileHover={{ scale: 1.1, zIndex: 30 }}
        transition={{ duration: 0.15 }}
        className="h-12 w-12 border-2 border-charcoal object-cover object-top cursor-pointer bg-paper shadow-brutal-sm hover:shadow-brutal"
      />
    </div>
  );
};

/**
 * AnimatedTooltip - Brutalist Clinical Blueprint styled
 * Use for showing team members or featured items with hover tooltips
 */
export function AnimatedTooltip({ items, className }: AnimatedTooltipProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {items.map((item) => (
        <TooltipItemComponent key={item.id} item={item} />
      ))}
    </div>
  );
}

/**
 * SingleImageTooltip - For single image with tooltip on hover
 * Perfect for memes and easter eggs
 */
interface SingleImageTooltipProps {
  image: string;
  name: string;
  designation: string;
  className?: string;
  imageClassName?: string;
}

export function SingleImageTooltip({ 
  image, 
  name, 
  designation, 
  className,
  imageClassName 
}: SingleImageTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const x = useMotionValue(0);
  
  const rotate = useSpring(useTransform(x, [-100, 100], [-8, 8]), {
    stiffness: 150,
    damping: 15,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    x.set(e.clientX - rect.left - centerX);
  };

  return (
    <div 
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brutalist Tooltip with Modi Ji flair */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.8 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          y: isHovered ? 0 : 15,
          scale: isHovered ? 1 : 0.8,
        }}
        transition={{ 
          duration: 0.2, 
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        style={{ rotate }}
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex flex-col items-center bg-cobalt border-2 border-charcoal px-5 py-3 shadow-brutal">
          <p className="whitespace-nowrap text-base font-heading font-bold text-paper uppercase tracking-wider">
            {name}
          </p>
          <p className="whitespace-nowrap text-xs font-mono text-paper/70 mt-0.5">
            {designation}
          </p>
          {/* Triangle pointer */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-cobalt" />
        </div>
      </motion.div>
      
      {/* Main Image */}
      <motion.img
        onMouseMove={handleMouseMove}
        src={image}
        alt={name}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "border-2 border-charcoal shadow-brutal cursor-pointer object-cover",
          imageClassName
        )}
      />
    </div>
  );
}

/**
 * DigitalIndiaPopup - Special Easter Egg component
 * Shows the Digital India meme with a troll vibe
 */
interface DigitalIndiaPopupProps {
  className?: string;
}

export function DigitalIndiaPopup({ className }: DigitalIndiaPopupProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div 
      className={cn("relative inline-flex flex-col items-center gap-3", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Troll Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.5,
          y: isHovered ? 0 : 20,
        }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        className="absolute -top-48 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-iodine border-3 border-charcoal p-3 shadow-brutal">
          <img
            src="/assets/easter-eggs/digital-india.jpg"
            alt="Digital India"
            className="w-48 h-auto border-2 border-charcoal"
          />
          <p className="text-center text-paper font-heading font-bold text-sm mt-2 uppercase">
            DIGITAL INDIA APPROVES
          </p>
        </div>
        {/* Arrow */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-iodine" />
      </motion.div>
      
      {/* Trigger Button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="brutal-btn bg-surgical text-paper px-4 py-2 text-sm cursor-pointer select-none"
      >
        <span className="font-heading font-bold uppercase tracking-wide">
          VERIFY SCORE
        </span>
      </motion.div>
    </motion.div>
  );
}

/**
 * TeamShowcase - Shows the BJP folks group as a team section
 */
interface TeamShowcaseProps {
  className?: string;
}

export function TeamShowcase({ className }: TeamShowcaseProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div 
      className={cn("relative inline-flex flex-col items-center", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      {/* Hover Popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          scale: isHovered ? 1 : 0.8,
          y: isHovered ? 0 : 10,
        }}
        transition={{ 
          type: "spring",
          stiffness: 400,
          damping: 25
        }}
        className="absolute -top-28 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-charcoal border-2 border-charcoal px-4 py-2 shadow-brutal whitespace-nowrap">
          <p className="text-paper font-heading font-bold text-sm uppercase tracking-wider">
            POWERED BY DIGITAL INDIA
          </p>
          <p className="text-paper/60 font-mono text-xs text-center mt-1">
            AI-Driven Healthcare Initiative
          </p>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-charcoal" />
      </motion.div>
      
      {/* Team Image Container */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative"
      >
        <div className="border-2 border-charcoal shadow-brutal bg-paper p-1 cursor-pointer">
          <img
            src="/assets/easter-eggs/bjp-folks.png"
            alt="Digital India Team"
            className="w-64 h-auto object-cover"
          />
        </div>
        
        {/* Label */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-cobalt border-2 border-charcoal px-3 py-1 shadow-brutal-sm">
          <span className="font-mono text-xs text-paper font-bold uppercase">
            OUR ADVISORS
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AnimatedTooltip;
