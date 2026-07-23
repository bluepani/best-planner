import { useClerk, UserProfile } from "@clerk/react";
import Modal from "./Modal";

export default function SettingsModal({ isOpen, onClose }) {
  const { signOut } = useClerk();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <section
        className="block-modal settings-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Account settings"
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Account</p>
            <h2>Settings</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="settings-profile">
          <UserProfile
            routing="virtual"
            appearance={{
              elements: {
                rootBox: "settings-user-profile",
                cardBox: "settings-user-card",
                navbar: "settings-user-nav",
              },
            }}
          />
        </div>

        <div className="card-actions settings-actions">
          <button
            type="button"
            className="ghost-button danger-button"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      </section>
    </Modal>
  );
}

export function SettingsIconButton({ onClick }) {
  return (
    <button
      type="button"
      className="ghost-button icon-button"
      onClick={onClick}
      title="Settings"
      aria-label="Open settings"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M19.4 13a7.8 7.8 0 0 0 .05-1 7.8 7.8 0 0 0-.05-1l2.05-1.6a.5.5 0 0 0 .12-.64l-1.94-3.36a.5.5 0 0 0-.6-.22l-2.42.97a7.3 7.3 0 0 0-1.73-1L14.7 2.7a.5.5 0 0 0-.5-.4h-3.4a.5.5 0 0 0-.5.4l-.38 2.45a7.3 7.3 0 0 0-1.73 1l-2.42-.97a.5.5 0 0 0-.6.22L3.43 8.76a.5.5 0 0 0 .12.64L5.6 11a7.8 7.8 0 0 0 0 2l-2.05 1.6a.5.5 0 0 0-.12.64l1.94 3.36a.5.5 0 0 0 .6.22l2.42-.97c.54.42 1.12.76 1.73 1l.38 2.45a.5.5 0 0 0 .5.4h3.4a.5.5 0 0 0 .5-.4l.38-2.45a7.3 7.3 0 0 0 1.73-1l2.42.97a.5.5 0 0 0 .6-.22l1.94-3.36a.5.5 0 0 0-.12-.64L19.4 13Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
