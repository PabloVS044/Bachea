"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadAfterPhoto } from "@/app/admin/actions";
import { compressImage } from "@/lib/compress-image";

export function AfterPhotoUpload({ reportId }: { reportId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const form = new FormData();
        form.set("id", reportId);
        form.set("photo", await compressImage(file));
        const failure = await uploadAfterPhoto(form);
        if (failure) setError(failure);
      } catch {
        setError("Una foto no se pudo leer. Usa JPG o PNG.");
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <label className="btn btn-dark btn-sm cursor-pointer has-[:focus-visible]:outline-3">
        {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />}
        {busy ? "Subiendo…" : "Subir fotos de después"}
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => upload(e.target.files)} />
      </label>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
