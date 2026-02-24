import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'motion/react';

interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  className?: string;
}

const ACTION_WIDTH = 60;
const VELOCITY_THRESHOLD = 300;
const OFFSET_THRESHOLD_RATIO = 0.35;
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 };

export function SwipeableRow({ children, actions, isOpen, onOpen, onClose, className = '' }: SwipeableRowProps) {
  const totalWidth = actions.length * ACTION_WIDTH;
  const x = useMotionValue(0);
  const actionsOpacity = useTransform(x, [-totalWidth, -20, 0], [1, 0.5, 0]);
  const actionsVisibility = useTransform(x, (v): 'visible' | 'hidden' => v < -2 ? 'visible' : 'hidden');
  const isDragging = useRef(false);

  // Animate to open/close when external state changes
  useEffect(() => {
    const target = isOpen ? -totalWidth : 0;
    animate(x, target, SPRING);
  }, [isOpen, totalWidth, x]);

  function handleDragEnd(_: any, info: PanInfo) {
    isDragging.current = false;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const threshold = totalWidth * OFFSET_THRESHOLD_RATIO;

    if (offset < -threshold || velocity < -VELOCITY_THRESHOLD) {
      onOpen();
    } else {
      onClose();
    }
  }

  function handleDragStart() {
    isDragging.current = true;
  }

  function handleTap() {
    // Only close on tap (not after a drag gesture)
    if (!isDragging.current && isOpen) {
      onClose();
    }
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Action buttons — positioned behind the sliding row */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-stretch z-0"
        style={{ width: totalWidth, visibility: actionsVisibility }}
      >
        {actions.map((action, i) => (
          <motion.button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            style={{ width: ACTION_WIDTH, opacity: actionsOpacity }}
            className={`flex flex-col items-center justify-center gap-1 ${action.bgClass} ${action.textClass} active:brightness-90 transition-[filter]`}
          >
            {action.icon}
            <span className="text-[10px] font-bold">{action.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Draggable content row */}
      <motion.div
        style={{ x, touchAction: 'pan-y' }}
        drag="x"
        dragConstraints={{ left: -totalWidth, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleTap}
        className="relative z-10 bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
