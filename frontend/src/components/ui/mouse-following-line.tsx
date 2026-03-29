"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { motion, useAnimate } from "framer-motion"
import { cn } from "@/lib/utils"

interface GridAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number
  rows?: number
  spacing?: number
  strokeLength?: number
  strokeWidth?: number
  lineColor?: string
}

export function GridAnimation({
  className,
  cols = 40,
  rows = 40,
  spacing = 40,
  strokeLength = 15,
  strokeWidth = 2,
  lineColor = "rgba(15,15,15,0.08)", // Charcoal subtle
  ...props
}: GridAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ballRef, animate] = useAnimate()
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const animationFrameRef = useRef<number | null>(null)
  const isMouseOverRef = useRef(false)
  const currentBallPosition = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const width = cols * spacing
    const height = rows * spacing
    setDimensions({ width, height })

    const centerX = width / 2
    const centerY = height / 2
    currentBallPosition.current = { x: centerX, y: centerY }

    if (ballRef.current) {
      animate(ballRef.current, { x: centerX, y: centerY }, { duration: 0 })
    }
  }, [cols, rows, spacing, ballRef, animate])

  const snapToGrid = (pointX: number, pointY: number) => {
    const nearestX = Math.round(pointX / spacing) * spacing
    const nearestY = Math.round(pointY / spacing) * spacing
    return { x: nearestX, y: nearestY }
  }

  const animateCanvas = useCallback(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    const ballX = currentBallPosition.current.x
    const ballY = currentBallPosition.current.y

    for (let col = 0; col <= cols; col++) {
      for (let row = 0; row <= rows; row++) {
        const pointX = col * spacing
        const pointY = row * spacing
        const dx = ballX - pointX
        const dy = ballY - pointY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 15) continue

        const angle = Math.atan2(dy, dx)

        ctx.beginPath()
        ctx.moveTo(pointX, pointY)
        ctx.lineTo(pointX - Math.cos(angle) * strokeLength, pointY - Math.sin(angle) * strokeLength)
        
        ctx.strokeStyle = lineColor
        ctx.lineWidth = strokeWidth
        ctx.stroke()
      }
    }

    if (isMouseOverRef.current) {
      animationFrameRef.current = requestAnimationFrame(animateCanvas)
    }
  }, [dimensions, cols, rows, spacing, strokeLength, strokeWidth, lineColor])

  const startAnimationLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    isMouseOverRef.current = true
    animationFrameRef.current = requestAnimationFrame(animateCanvas)
  }, [animateCanvas])

  const stopAnimationLoop = useCallback(() => {
    isMouseOverRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    requestAnimationFrame(animateCanvas)
  }, [animateCanvas])

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    const { x: snapX, y: snapY } = snapToGrid(mouseX, mouseY)

    currentBallPosition.current = { x: snapX, y: snapY }

    animate(
      ballRef.current,
      { x: snapX, y: snapY },
      {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    )
  }

  const handleMouseEnter = () => {
    startAnimationLoop()
  }

  const handleMouseLeave = () => {
    const centerX = dimensions.width / 2
    const centerY = dimensions.height / 2

    currentBallPosition.current = { x: centerX, y: centerY }

    animate(
      ballRef.current,
      { x: centerX, y: centerY },
      {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    )

    stopAnimationLoop()
  }

  useEffect(() => {
    if (canvasRef.current && ballRef.current) {
      requestAnimationFrame(animateCanvas)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animateCanvas])

  return (
    <div
      className={cn("absolute inset-0 z-0 overflow-hidden cursor-crosshair", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60" 
      />
      <motion.div
        ref={ballRef}
        className="absolute w-[8px] h-[8px] rounded-full bg-cobalt shadow-[2px_2px_0px_rgba(15,15,15,1)] z-10 pointer-events-none"
        style={{
          x: 0,
          y: 0,
          marginLeft: -4,
          marginTop: -4,
        }}
      />
    </div>
  )
}
