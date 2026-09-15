"use client";

import { useState, useTransition } from "react";
import { copyContractSigningLink } from "@/app/bookings/financial-actions";

export function CopyContractLinkButton({
  bookingId,
  contractId,
}: Readonly<{ bookingId: string; contractId: string }>) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function copyLink() {
    setMessage(null);
    startTransition(async () => {
      const result = await copyContractSigningLink(bookingId, contractId);
      if (!result.token) {
        setIsError(true);
        setMessage(result.error ?? "Unable to create a signing link.");
        return;
      }
      const link = `${window.location.origin}/sign/${result.token}`;
      try {
        await navigator.clipboard.writeText(link);
        setIsError(false);
        setMessage("Contract link copied.");
      } catch {
        setIsError(true);
        setMessage("The signing link was created, but your browser could not copy it.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        aria-label="Copy contract link"
        className="secondary-button h-10 w-10 px-0 text-lg"
        disabled={pending}
        onClick={copyLink}
        title="Copy contract link"
        type="button"
      >
        {pending ? "…" : "⧉"}
      </button>
      {message && (
        <p
          className={`absolute right-0 top-12 z-10 w-64 rounded-lg px-3 py-2 text-xs shadow-sm ${
            isError ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
          }`}
          role="status"
        >
          {message}
        </p>
      )}
    </div>
  );
}
