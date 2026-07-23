import Modal from "./Modal";
import { formatDuration, formatTime, getTypeColor } from "../utils/time";

function highlightNow(text) {
  if (!text) return text;

  const parts = String(text).split(/(\bnow\b)/gi);
  return parts.map((part, index) =>
    part.toLowerCase() === "now" ? (
      <span className="now-word" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function getNudgeCopy(activity) {
  if (activity.status === "current" && activity.block) {
    const label = activity.block.label || "Untitled block";
    return {
      eyebrow: "Right now",
      prefix: "You should be doing",
      highlight: label,
      detail: `${formatTime(activity.block.start)}-${formatTime(activity.block.end)} · ${formatDuration(activity.block.duration)} · ${activity.block.type}`,
      punchline: "That means now. Not later. Not after one more scroll. Now.",
    };
  }

  if (activity.status === "before" && activity.nextBlock) {
    return {
      eyebrow: "Not yet",
      prefix: "Ease in — next up is",
      highlight: activity.nextBlock.label || "your first block",
      detail: `Starts at ${formatTime(activity.nextBlock.start)}`,
      punchline: "Enjoy the calm. The schedule is warming up the judgmental stare.",
    };
  }

  if (activity.status === "gap" && activity.nextBlock) {
    return {
      eyebrow: "Unplanned pocket",
      prefix: "Nothing is scheduled right now. Next up:",
      highlight: activity.nextBlock.label || "Untitled block",
      detail: `Starts at ${formatTime(activity.nextBlock.start)}`,
      punchline: "A rare free moment. Don't invent a new crisis.",
    };
  }

  if (activity.status === "after") {
    return {
      eyebrow: "Day complete",
      prefix: "You're done with today's plan",
      highlight: "",
      detail: "All scheduled blocks are behind you.",
      punchline: "Clock out emotionally. The planner already did.",
    };
  }

  return {
    eyebrow: "Check-in",
    prefix: "No current block found",
    highlight: "",
    detail: "Your schedule is set, but nothing lines up with this exact minute.",
    punchline: "Weird timeline energy. Take a sip of water anyway.",
  };
}

export default function NowNudge({ isOpen, onClose, activity, typeDefinitions }) {
  const copy = getNudgeCopy(activity);
  const accent = activity.block
    ? getTypeColor(activity.block.type, typeDefinitions)
    : activity.nextBlock
      ? getTypeColor(activity.nextBlock.type, typeDefinitions)
      : "#0f766e";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <section
        className="block-modal now-nudge-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="What you should be doing"
        style={{ "--nudge-accent": accent }}
      >
        <div className="now-nudge-layout">
          <div className="now-nudge-copy">
            <p className="eyebrow">{highlightNow(copy.eyebrow)}</p>
            <h2>
              <span className="now-nudge-prefix">{highlightNow(copy.prefix)}</span>
              {copy.highlight ? (
                <span className="now-nudge-highlight">{highlightNow(copy.highlight)}</span>
              ) : null}
            </h2>
            <p className="now-nudge-detail">{highlightNow(copy.detail)}</p>
            <p className="now-nudge-punchline">{highlightNow(copy.punchline)}</p>
            <button type="button" className="primary-button" onClick={onClose}>
              Okay, I&apos;m on it
            </button>
          </div>

          <figure className="now-nudge-art">
            <img
              src="/do-it-now.png"
              alt="Goofy cartoon character pointing and yelling to do the task right now"
            />
            <figcaption>{highlightNow("Do it. Right now.")}</figcaption>
          </figure>
        </div>
      </section>
    </Modal>
  );
}
