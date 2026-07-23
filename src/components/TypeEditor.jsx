import { useState } from "react";
import Modal from "./Modal";
import { DEFAULT_TYPE_DEFINITIONS, normalizeTypeDefinitions } from "../utils/time";

function createUniqueTypeName(types) {
  let count = 1;
  let candidate = "New Type";
  const names = new Set(types.map((type) => type.name));
  while (names.has(candidate)) {
    count += 1;
    candidate = `New Type ${count}`;
  }
  return candidate;
}

export default function TypeEditor({ typeDefinitions, onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialDraft, setInitialDraft] = useState("");
  const [draftTypes, setDraftTypes] = useState(() =>
    normalizeTypeDefinitions(typeDefinitions).map((type) => ({
      ...type,
      originalName: type.name,
    })),
  );
  const [error, setError] = useState("");
  const isDirty = JSON.stringify(draftTypes) !== initialDraft;

  function openModal() {
    const nextDraftTypes = normalizeTypeDefinitions(typeDefinitions).map((type) => ({
      ...type,
      originalName: type.name,
    }));
    setDraftTypes(nextDraftTypes);
    setInitialDraft(JSON.stringify(nextDraftTypes));
    setError("");
    setIsOpen(true);
  }

  function updateType(index, updates) {
    setDraftTypes((current) =>
      current.map((type, typeIndex) =>
        typeIndex === index
          ? {
              ...type,
              ...updates,
            }
          : type,
      ),
    );
    setError("");
  }

  function addType() {
    setDraftTypes((current) => [
      ...current,
      {
        name: createUniqueTypeName(current),
        color: "#475569",
        originalName: "",
      },
    ]);
  }

  function removeType(index) {
    setDraftTypes((current) => current.filter((_, typeIndex) => typeIndex !== index));
  }

  function handleSave(event) {
    event.preventDefault();
    const normalized = normalizeTypeDefinitions(draftTypes);
    if (!normalized.length) {
      setError("Add at least one type.");
      return;
    }

    onSave(draftTypes);
    setIsOpen(false);
  }

  return (
    <section className="type-editor-shell">
      <button type="button" className="secondary-button edit-type-button" onClick={openModal}>
        Edit Type
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <form
          className="block-modal"
          onSubmit={handleSave}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Edit types"
        >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Types</p>
                <h2>Edit Type</h2>
              </div>
              {isDirty ? (
                <button type="submit" className="ghost-button">
                  Save
                </button>
              ) : (
                <button type="button" className="ghost-button" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
              )}
            </div>

            <div className="type-editor-list">
              {draftTypes.map((type, index) => (
                <div className="type-editor-row" key={`${type.name}-${index}`}>
                  <label className="field">
                    <span>Name</span>
                    <input
                      value={type.name}
                      onChange={(event) => updateType(index, { name: event.target.value })}
                    />
                  </label>
                  <label className="field type-color-picker">
                    <span>Color</span>
                    <input
                      type="color"
                      value={type.color}
                      onChange={(event) => updateType(index, { color: event.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    onClick={() => removeType(index)}
                    disabled={draftTypes.length <= 1}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {error ? <p className="inline-error">{error}</p> : null}

            <div className="card-actions">
              <button type="button" className="secondary-button" onClick={addType}>
                Add Type
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  setDraftTypes(
                    DEFAULT_TYPE_DEFINITIONS.map((type) => ({
                      ...type,
                      originalName: type.name,
                    })),
                  )
                }
              >
                Reset Defaults
              </button>
              <button type="submit" className="primary-button">
                Save Types
              </button>
            </div>
        </form>
      </Modal>
    </section>
  );
}
