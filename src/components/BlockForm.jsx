import { useRef, useState } from "react";
import Modal from "./Modal";
import { formatDuration, getTypeNames } from "../utils/time";

const initialForm = {
  label: "",
  hours: "",
  minutes: "",
  type: "Other",
  notes: "",
  locked: false,
};

export default function BlockForm({ onAdd, typeDefinitions }) {
  const typeNames = getTypeNames(typeDefinitions);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    ...initialForm,
    type: typeNames.includes(initialForm.type) ? initialForm.type : typeNames[0],
  });
  const [error, setError] = useState("");
  const isDirty =
    Boolean(form.label.trim()) ||
    Boolean(form.hours) ||
    Boolean(form.minutes) ||
    form.type !== (typeNames.includes(initialForm.type) ? initialForm.type : typeNames[0]) ||
    Boolean(form.notes.trim()) ||
    form.locked;
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const previewMinutes = Math.max(
    0,
    Math.round(Number(form.hours || 0) * 60 + Number(form.minutes || 0)),
  );

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setError("");
  }

  function closeModal() {
    setIsOpen(false);
    setError("");
  }

  function resetAndClose() {
    setForm({
      ...initialForm,
      type: typeNames.includes(initialForm.type) ? initialForm.type : typeNames[0],
    });
    closeModal();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const label = form.label.trim();
    const hours = Number(form.hours || 0);
    const minutes = Number(form.minutes || 0);
    const totalMinutes = Math.round(hours * 60 + minutes);

    if (!label) {
      setError("Enter a block label.");
      return;
    }

    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || totalMinutes < 0) {
      setError("Enter a valid time.");
      return;
    }

    onAdd({
      label,
      duration: totalMinutes,
      type: form.type,
      notes: form.notes.trim(),
      color: "",
      locked: form.locked,
    });
    resetAndClose();
  }

  return (
    <section className="create-block-shell">
      <button
        type="button"
        className="primary-button create-block-button"
        onClick={() => {
          setForm((current) => ({
            ...current,
            type: typeNames.includes(current.type) ? current.type : typeNames[0],
          }));
          setError("");
          setIsOpen(true);
        }}
      >
        Create Block
      </button>

      <Modal isOpen={isOpen} onClose={closeModal}>
        <form
          className="block-modal"
          onSubmit={handleSubmit}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Create block"
        >
          <div className="modal-header">
            <div>
              <p className="eyebrow">New block</p>
              <h2>Create Block</h2>
            </div>
            {isDirty ? (
              <button type="submit" className="ghost-button">
                Save
              </button>
            ) : (
              <button type="button" className="ghost-button" onClick={resetAndClose}>
                Cancel
              </button>
            )}
          </div>

          <div className="modal-grid">
            <label className="field label-field">
              <span>Label</span>
              <input
                value={form.label}
                onChange={(event) => updateField("label", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !form.hours && !form.minutes) {
                    event.preventDefault();
                    hoursRef.current?.focus();
                  }
                }}
                placeholder="Physics F=MA Paper"
                autoFocus
              />
            </label>

            <div className="duration-pair">
              <label className="field duration-field">
                <span>Hours</span>
                <input
                  ref={hoursRef}
                  type="number"
                  min="0"
                  step="1"
                  value={form.hours}
                  onChange={(event) => updateField("hours", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      minutesRef.current?.focus();
                    }
                  }}
                  placeholder="0"
                />
              </label>

              <label className="field duration-field">
                <span>Minutes</span>
                <input
                  ref={minutesRef}
                  type="number"
                  min="0"
                  step="1"
                  value={form.minutes}
                  onChange={(event) => updateField("minutes", event.target.value)}
                  placeholder="0"
                />
              </label>
            </div>

            <p className="duration-preview" aria-live="polite">
              Length: <strong>{formatDuration(previewMinutes)}</strong>
            </p>

            <label className="field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
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
                checked={form.locked}
                onChange={(event) => updateField("locked", event.target.checked)}
              />
              <span>Locked</span>
            </label>

            <label className="field notes-field">
              <span>Notes</span>
              <textarea
                rows="4"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Notes, reminders, or context"
              />
            </label>
          </div>

          {error ? <p className="inline-error">{error}</p> : null}

          <div className="card-actions">
            <button type="submit" className="primary-button">
              Create Block
            </button>
            <button type="button" className="ghost-button" onClick={resetAndClose}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
