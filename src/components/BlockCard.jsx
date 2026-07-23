import { useState } from "react";
import Modal from "./Modal";
import {
  formatDuration,
  formatTime,
  getTypeColor,
  getTypeNames,
} from "../utils/time";

export default function BlockCard({
  block,
  index,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragSource,
  progressStatus = "upcoming",
  typeDefinitions,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const typeNames = getTypeNames(typeDefinitions);
  const blockColor = getTypeColor(block.type, typeDefinitions);
  const durationHours = Math.floor(Number(block.duration || 0) / 60);
  const durationMinutes = Number(block.duration || 0) % 60;

  function updateDurationPart(part, value) {
    const numericValue = Math.max(0, Number(value) || 0);
    const nextHours = part === "hours" ? numericValue : durationHours;
    const nextMinutes = part === "minutes" ? numericValue : durationMinutes;
    onUpdate(block.id, {
      duration: Math.round(nextHours * 60 + nextMinutes),
    });
    setIsDirty(true);
  }

  function updateBlock(updates) {
    onUpdate(block.id, updates);
    setIsDirty(true);
  }

  return (
    <>
      <article
        className={`block-card progress-${progressStatus} ${block.overflows ? "overflowing" : ""} ${block.locked ? "locked" : ""} ${isDragSource ? "drag-source" : ""}`}
        style={{ "--block-color": blockColor }}
        draggable={!block.locked}
        onClick={() => {
          setIsDirty(false);
          setIsOpen(true);
        }}
        onDragStart={(event) => onDragStart(block.id, event)}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOver(block.id, event);
        }}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsDirty(false);
            setIsOpen(true);
          }
        }}
      >
        <span className="block-color-dot" style={{ backgroundColor: blockColor }} />
        <div className="block-time">
          <strong>
            {formatTime(block.start)}-{formatTime(block.end)}
          </strong>
          <small className="block-duration">{formatDuration(block.duration)}</small>
        </div>

        <div className="block-summary">
          <h3>{block.label || "Untitled block"}</h3>
        </div>

        <span className="type-chip" style={{ "--chip-color": blockColor }}>
          {block.type}
        </span>

        {block.overflows ? <span className="overflow-badge">Overtime</span> : null}

        {block.notes?.trim() ? (
          <p className="block-print-notes">{block.notes.trim()}</p>
        ) : null}
      </article>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <section
          className="block-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Block details"
        >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Block details</p>
                <h2>{block.label || "Untitled block"}</h2>
                <span>
                  {formatTime(block.start)}-{formatTime(block.end)} · {formatDuration(block.duration)}
                </span>
              </div>
              <button type="button" className="ghost-button" onClick={() => setIsOpen(false)}>
                {isDirty ? "Save" : "Cancel"}
              </button>
            </div>

            <div className="modal-grid">
              <label className="field label-field">
                <span>Label</span>
                <input
                  value={block.label}
                  onChange={(event) => updateBlock({ label: event.target.value })}
                  placeholder="Untitled block"
                />
              </label>

              <div className="duration-pair">
                <label className="field duration-field">
                  <span>Hours</span>
                  <input
                    type="number"
                    min="0"
                    value={durationHours}
                    onChange={(event) => updateDurationPart("hours", event.target.value)}
                  />
                </label>

                <label className="field duration-field">
                  <span>Minutes</span>
                  <input
                    type="number"
                    min="0"
                    value={durationMinutes}
                    onChange={(event) => updateDurationPart("minutes", event.target.value)}
                  />
                </label>
              </div>

              <label className="field">
                <span>Type</span>
                <select
                  value={block.type}
                  onChange={(event) => updateBlock({ type: event.target.value })}
                >
                  {typeNames.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="toggle-row compact-toggle">
                <input
                  type="checkbox"
                  checked={block.locked}
                  onChange={(event) => updateBlock({ locked: event.target.checked })}
                />
                <span>Locked</span>
              </label>

              <label className="field notes-field">
                <span>Notes</span>
                <textarea
                  rows="4"
                  value={block.notes}
                  onChange={(event) => updateBlock({ notes: event.target.value })}
                  placeholder="Notes, reminders, or context"
                />
              </label>
            </div>

            <div className="card-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => onMove(index, -1)}
                disabled={!canMoveUp}
                title="Move up"
              >
                Move Up
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => onMove(index, 1)}
                disabled={!canMoveDown}
                title="Move down"
              >
                Move Down
              </button>
              <button type="button" className="secondary-button" onClick={() => onDuplicate(block.id)}>
                Duplicate Block
              </button>
              <button
                type="button"
                className="ghost-button danger-button"
                onClick={() => {
                  onDelete(block.id);
                  setIsOpen(false);
                }}
              >
                Delete Block
              </button>
            </div>
        </section>
      </Modal>
    </>
  );
}
