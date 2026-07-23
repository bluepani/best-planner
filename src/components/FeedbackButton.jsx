import { useState } from "react";
import FeedbackModal from "./FeedbackModal";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ghost-button feedback-trigger no-print"
        onClick={() => setIsOpen(true)}
        title="Suggest feedback"
        aria-label="Suggest feedback"
      >
        Suggest feedback
      </button>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
