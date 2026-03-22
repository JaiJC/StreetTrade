import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Loader2, UploadCloud } from "lucide-react";
import { analyzeUpload } from "../lib/api";

export default function DetectionDemo() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const fileInputRef = useRef(null);

  const mutation = useMutation({
    mutationFn: analyzeUpload,
  });

  useEffect(() => {
    if (!mutation.isPending) {
      return undefined;
    }
    setStepIndex(0);
    const timers = [
      setTimeout(() => setStepIndex(1), 500),
      setTimeout(() => setStepIndex(2), 1000),
      setTimeout(() => setStepIndex(3), 1500),
    ];
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [mutation.isPending]);

  function onFilePicked(selected) {
    if (!selected) {
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    mutation.reset();
    setStepIndex(0);
  }

  function onFileChange(event) {
    onFilePicked(event.target.files?.[0]);
  }

  function onAnalyzeClick() {
    if (!file) return;
    mutation.mutate(file);
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    onFilePicked(droppedFile);
  }

  const steps = [
    "Extracting text from signage...",
    "Classifying business type...",
    "Cross-referencing databases...",
  ];

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">See the AI in action</h3>
        <p className="text-sm text-slate-600">
          Upload any storefront photo and watch StreetTrade identify the business.
        </p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          isDragging
            ? "border-streettrade-accent bg-sky-50"
            : "border-slate-300 bg-slate-50 hover:border-streettrade-accent hover:bg-sky-50/40"
        }`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Uploaded storefront preview"
            className="max-h-72 w-full rounded-xl object-cover"
          />
        ) : (
          <>
            <UploadCloud className="mb-2 h-8 w-8 text-slate-500" />
            <p className="font-semibold text-slate-700">{isDragging ? "Drop it!" : "Drop a storefront photo here"}</p>
            <p className="mt-1 text-sm text-slate-500">or click to browse · JPG, PNG up to 10MB</p>
          </>
        )}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

      <button
        type="button"
        onClick={onAnalyzeClick}
        disabled={!file || mutation.isPending}
        className="rounded-xl bg-streettrade-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending ? "Analyzing..." : "Analyze storefront"}
      </button>

      {mutation.isPending && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {steps.map((step, index) => {
            const done = stepIndex > index;
            const active = stepIndex === index;
            return (
              <div key={step} className="flex items-center gap-2">
                {done ? (
                  <span className="text-green-600">✓</span>
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-streettrade-accent" />
                ) : (
                  <span className="text-slate-300">○</span>
                )}
                <span className={done || active ? "text-slate-700" : "text-slate-400"}>{step}</span>
              </div>
            );
          })}
        </div>
      )}

      {mutation.isSuccess && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {previewUrl ? (
              <img src={previewUrl} alt="Uploaded storefront preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-64 items-center justify-center text-slate-400">
                <Camera className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <h4 className="text-base font-semibold">🏪 Detected Business</h4>
            <p>
              <span className="font-semibold">Name:</span> {mutation.data.business_name || "Unknown"}
            </p>
            <p>
              <span className="font-semibold">Category:</span> {mutation.data.category || "other"}
            </p>
            <div>
              <p className="mb-1 font-semibold">Confidence: {Math.round((mutation.data.confidence || 0) * 100)}%</p>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-streettrade-accent"
                  style={{ width: `${Math.round((mutation.data.confidence || 0) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="font-semibold">Raw OCR text:</p>
              <p className="mt-1 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                {mutation.data.raw_ocr_text || "No OCR text extracted"}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              ✨ Not on Google
            </span>
          </div>
        </div>
      )}

      {mutation.isError && (
        <p className="text-sm text-red-600">Detection failed. Please try another image.</p>
      )}
    </section>
  );
}
