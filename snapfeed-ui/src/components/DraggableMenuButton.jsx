import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";

export default function DraggableMenuButton({ onClick }) {
  const [position, setPosition] = useState({ x: 12, y: 12 });
  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
    // Load saved position from localStorage
    const saved = localStorage.getItem("menu-button-position");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleStart = (clientX, clientY) => {
    hasMoved.current = false;
    initialPos.current = { x: position.x, y: position.y };
    setIsDragging(true);
    dragStartPos.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const handleMove = (clientX, clientY) => {
    if (!isDragging) return;

    const newX = clientX - dragStartPos.current.x;
    const newY = clientY - dragStartPos.current.y;

    // If moved more than 8px from initial position, consider it a drag
    const deltaX = Math.abs(newX - initialPos.current.x);
    const deltaY = Math.abs(newY - initialPos.current.y);
    if (deltaX > 8 || deltaY > 8) {
      hasMoved.current = true;
    }

    // Constrain to viewport
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;

    const constrainedX = Math.max(8, Math.min(maxX, newX));
    const constrainedY = Math.max(8, Math.min(maxY, newY));

    setPosition({ x: constrainedX, y: constrainedY });
  };

  const handleEnd = () => {
    setIsDragging(false);

    // Save position if moved
    if (hasMoved.current) {
      localStorage.setItem("menu-button-position", JSON.stringify(position));
    } else {
      // Only trigger click if didn't move
      // Use setTimeout to avoid race condition with parent handlers
      setTimeout(() => {
        onClick?.();
      }, 0);
    }
  };

  // Mouse events
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e) => {
    e.stopPropagation();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    handleEnd();
  };

  useEffect(() => {
    if (isDragging) {
      const handleDocMouseMove = (e) => handleMouseMove(e);
      const handleDocMouseUp = (e) => handleMouseUp(e);
      const handleDocTouchMove = (e) => handleTouchMove(e);
      const handleDocTouchEnd = (e) => handleTouchEnd(e);

      document.addEventListener("mousemove", handleDocMouseMove);
      document.addEventListener("mouseup", handleDocMouseUp);
      document.addEventListener("touchmove", handleDocTouchMove);
      document.addEventListener("touchend", handleDocTouchEnd);

      return () => {
        document.removeEventListener("mousemove", handleDocMouseMove);
        document.removeEventListener("mouseup", handleDocMouseUp);
        document.removeEventListener("touchmove", handleDocTouchMove);
        document.removeEventListener("touchend", handleDocTouchEnd);
      };
    }
  }, [isDragging]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="fixed z-50 flex h-12 w-12 touch-none select-none items-center justify-center rounded-full border border-gray-200/90 bg-white/95 text-gray-800 shadow-lg backdrop-blur-md transition-transform active:scale-95 dark:border-white/10 dark:bg-[#1f1f1f]/95 dark:text-white"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      aria-label="Mở menu"
    >
      <Menu className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}
