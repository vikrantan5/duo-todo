"use client";
import { X } from "lucide-react";

/** Lightweight dialog in the repo's .card idiom (no UI library in this app). */
export default function Modal({
  open,
  title,
  onClose,
  children,
  testId,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="card relative z-10 w-full max-w-md p-6 animate-fade-up shadow-soft" data-testid={testId}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost !p-2" data-testid="modal-close-btn" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
