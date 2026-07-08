import { FileCheck2, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

export function UploadBox({ label, required, accept = "image/*", onFileChange }: { label: string; required?: boolean; accept?: string; onFileChange?: (file: File | null) => void }) {
  const [preview, setPreview] = useState<string>();
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  function applyFile(file: File | null) {
    if (!file) {
      onFileChange?.(null);
      return;
    }
    setFileName(file.name);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined);
    onFileChange?.(file);
  }

  return (
    <div
      tabIndex={0}
      onPaste={(event) => {
        const item = Array.from(event.clipboardData.items).find((clipboardItem) => clipboardItem.type.startsWith("image/"));
        const file = item?.getAsFile();
        if (!file) return;
        event.preventDefault();
        applyFile(new File([file], `clipboard-${Date.now()}.png`, { type: file.type || "image/png" }));
      }}
    >
      <p className="mb-2 text-sm font-bold text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</p>
      <button type="button" onClick={() => inputRef.current?.click()} className="flex h-32 w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white/70 text-slate-500">
        {preview ? <img src={preview} className="h-full w-full object-cover" alt={label} /> : fileName ? <span className="flex flex-col items-center gap-2 px-3 text-center text-sm font-bold"><FileCheck2 size={24} />{fileName}</span> : <span className="flex flex-col items-center gap-2 text-sm font-bold"><ImagePlus size={24} />上传/粘贴图片</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          applyFile(file || null);
        }}
      />
    </div>
  );
}
