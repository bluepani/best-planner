import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

let bodyScrollLocks = 0;

function lockBodyScroll() {
  bodyScrollLocks += 1;
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  bodyScrollLocks = Math.max(0, bodyScrollLocks - 1);
  if (bodyScrollLocks === 0) {
    document.body.style.overflow = "";
  }
}

export function resetBodyScrollLock() {
  bodyScrollLocks = 0;
  document.body.style.overflow = "";
}

export default function Modal({ isOpen, onClose, children }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    lockBodyScroll();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onCloseRef.current?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={() => onCloseRef.current?.()} role="presentation">
      {children}
    </div>,
    document.body,
  );
}
