import { useState, useEffect } from "react";
import { Button } from "./Button";

interface ConfirmModalProps {
  open: boolean;
  mode: "accept" | "reject" | null;
  candidateName: string;
  onClose: () => void;
  onConfirm: (payload: {
    password?: string;
    comment?: string;
  }) => void;
}

export function ConfirmModal({
  open,
  mode,
  candidateName,
  onClose,
  onConfirm,
}: ConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) {
      setPassword("");
      setComment("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <h2 className="text-xl font-bold mb-3">
          {mode === "accept"
            ? "Accepter la candidature"
            : "Refuser la candidature"}
        </h2>

        <p className="text-slate-600 mb-5">
          {candidateName}
        </p>

        {mode === "accept" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Mot de passe du compte
            </label>

            <input
              className="w-full border rounded-lg p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laisser vide pour générer automatiquement"
            />
          </div>
        )}

        {mode === "reject" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Motif
            </label>

            <textarea
              rows={4}
              className="w-full border rounded-lg p-2"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>

          <Button
            variant={mode === "accept" ? "primary" : "danger"}
            onClick={() =>
              onConfirm({
                password,
                comment,
              })
            }
          >
            Confirmer
          </Button>
        </div>

      </div>
    </div>
  );
}