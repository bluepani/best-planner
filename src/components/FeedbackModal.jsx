import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import Modal from "./Modal";

export default function FeedbackModal({
  isOpen,
  onClose,
  title = "Suggest feedback",
  eyebrow = "Feedback",
  ariaLabel,
  bodyPlaceholder = "Share your suggestion or feedback…",
}) {
  const { user } = useUser();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    setStatus("idle");
    setErrorMessage("");
    return undefined;
  }, [isOpen]);

  function resetForm() {
    setSubject("");
    setBody("");
    setStatus("idle");
    setErrorMessage("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject && !trimmedBody) {
      setStatus("error");
      setErrorMessage("Add a subject or message before sending.");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    const replyTo =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      undefined;

    const subjectOut = trimmedSubject || "BestPlanner feedback";
    const bodyOut = trimmedBody || "(No message)";

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectOut,
          body: bodyOut,
          ...(replyTo ? { replyTo } : {}),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || "Could not send your message. Please try again.",
        );
      }

      setStatus("success");
      setSubject("");
      setBody("");
      window.setTimeout(() => {
        handleClose();
      }, 1400);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error.message || "Could not send your message. Please try again.",
      );
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <form
        className="block-modal feedback-modal"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" className="ghost-button" onClick={handleClose}>
            Close
          </button>
        </div>

        {status === "success" ? (
          <div className="feedback-success" role="status" aria-live="polite">
            <p className="feedback-success-title">Sent</p>
            <p className="feedback-success-copy">Thanks — your message is on its way.</p>
          </div>
        ) : (
          <>
            <div className="modal-grid">
              <label className="field label-field">
                <span>Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="What's this about?"
                  autoFocus
                  disabled={status === "sending"}
                />
              </label>

              <label className="field notes-field">
                <span>Message</span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={bodyPlaceholder}
                  rows={6}
                  disabled={status === "sending"}
                />
              </label>
            </div>

            {status === "error" && errorMessage ? (
              <p className="feedback-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="card-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={handleClose}
                disabled={status === "sending"}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
