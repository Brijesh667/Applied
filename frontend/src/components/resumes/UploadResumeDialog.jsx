/**
 * UploadResumeDialog component
 * Accessible modal dialog for uploading PDF or DOCX resumes.
 * Supports:
 * - Drag and drop zone + keyboard accessible file picker button
 * - Client-side validation: file type (.pdf, .docx), file size (<= 5 MB), non-empty file
 * - Optional label input with counter and default to file name without extension
 * - Inline error presentation (both client validation and server errors)
 * - Disabled state and spinner while uploading (blocks backdrop closing)
 * - Closes on success and fires toast.success("Resume uploaded")
 */
import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/Input.jsx";
import { Field } from "../ui/Field.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import {
  RESUME_MAX_BYTES,
  RESUME_LABEL_MAX,
  RESUME_ACCEPT_STRING,
  RESUME_ACCEPTED_EXTENSIONS,
  RESUME_ACCEPTED_MIME_TYPES,
} from "../../lib/constants.js";
import { formatBytes } from "../../lib/format.js";
import { normalizeText } from "../../lib/normalize.js";
import { useUploadResume } from "../../hooks/useUploadResume.js";
import { cn } from "../../lib/cn.js";

function getFileNameWithoutExtension(fileName) {
  if (!fileName) return "";
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return fileName;
  return fileName.slice(0, lastDot);
}

export function UploadResumeDialog({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const labelInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [label, setLabel] = useState("");
  const [labelTouched, setLabelTouched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const { mutateAsync: uploadResume, isPending: isUploading } =
    useUploadResume();

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setLabel("");
      setLabelTouched(false);
      setFieldErrors({});
      setServerError("");
      if (dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
    } else {
      if (dialogRef.current && dialogRef.current.open) {
        dialogRef.current.close();
      }
    }
  }, [isOpen]);

  const validateFile = (candidateFile) => {
    if (!candidateFile) {
      return "Resume file is required.";
    }

    if (candidateFile.size === 0) {
      return "The selected file is empty.";
    }

    if (candidateFile.size > RESUME_MAX_BYTES) {
      return "File is too large. Maximum size is 5 MB.";
    }

    const name = candidateFile.name.toLowerCase();
    const hasValidExt = RESUME_ACCEPTED_EXTENSIONS.some((ext) =>
      name.endsWith(ext)
    );
    const hasValidMime =
      !candidateFile.type ||
      RESUME_ACCEPTED_MIME_TYPES.includes(candidateFile.type);

    if (!hasValidExt || !hasValidMime) {
      return "Only PDF or DOCX files are allowed.";
    }

    return null;
  };

  const handleSelectFile = (candidateFile) => {
    setServerError("");
    const error = validateFile(candidateFile);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, file: error }));
      setFile(null);
      return;
    }

    setFieldErrors((prev) => ({ ...prev, file: "" }));
    setFile(candidateFile);

    // If user hasn't typed a custom label yet, auto-populate with file name without extension
    if (!labelTouched || !label) {
      const suggested = getFileNameWithoutExtension(candidateFile.name).slice(
        0,
        RESUME_LABEL_MAX
      );
      setLabel(suggested);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleSelectFile(droppedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) return;

    setServerError("");
    const fileError = validateFile(file);
    let labelError = null;
    const normLabel = normalizeText(label);

    if (normLabel.length > RESUME_LABEL_MAX) {
      labelError = `Label cannot exceed ${RESUME_LABEL_MAX} characters.`;
    }

    if (fileError || labelError) {
      setFieldErrors({
        file: fileError || "",
        label: labelError || "",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (normLabel) {
      formData.append("label", normLabel);
    }

    try {
      await uploadResume(formData);
      toast.success("Resume uploaded");
      onClose();
    } catch (err) {
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        "Could not upload resume. Try again.";
      setServerError(msg);
    }
  };

  const handleCancel = (e) => {
    if (isUploading) {
      e?.preventDefault();
      return;
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={(e) => {
        if (e.target === dialogRef.current && !isUploading) {
          handleCancel();
        }
      }}
      className={cn(
        "backdrop:bg-black/40",
        "m-auto p-6 rounded-[16px] bg-surface text-ink border border-rule",
        "shadow-[0_12px_32px_rgb(0_0_0_/_0.18)] max-w-[500px] w-[calc(100%-32px)]",
        "transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
        "open:animate-in open:fade-in open:zoom-in-95 select-none"
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] leading-[26px] font-bold text-ink">
            Upload resume
          </h2>
          <button
            type="button"
            disabled={isUploading}
            onClick={handleCancel}
            aria-label="Close dialog"
            className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-ink-soft hover:text-ink hover:bg-sunken transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {serverError && (
          <div
            role="alert"
            className="p-3 rounded-[8px] bg-danger-bg text-danger text-[13px] leading-[18px] border border-danger-tint select-text"
          >
            {serverError}
          </div>
        )}

        {/* Drop zone */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] leading-[16px] text-ink-soft font-medium">
            File
          </span>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isUploading) fileInputRef.current?.click();
              }
            }}
            tabIndex={isUploading ? -1 : 0}
            role="button"
            aria-label={
              file ? `Selected file: ${file.name}` : "Upload resume file dropzone"
            }
            className={cn(
              "p-6 rounded-[12px] border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2",
              isDragging
                ? "border-primary bg-primary-soft/30"
                : fieldErrors.file
                ? "border-danger bg-danger-bg/20"
                : "border-rule bg-sunken/40 hover:bg-sunken/80",
              "focus:outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={RESUME_ACCEPT_STRING}
              disabled={isUploading}
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) handleSelectFile(picked);
              }}
              className="sr-only"
            />

            {file ? (
              <div className="flex items-center gap-3 text-left w-full max-w-full truncate px-2">
                <span className="w-10 h-10 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-[20px] font-semibold text-ink truncate">
                    {file.name}
                  </p>
                  <p className="text-[12px] leading-[16px] text-ink-soft tabular-nums">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <span className="text-[12px] leading-[16px] font-medium text-primary shrink-0">
                  Change
                </span>
              </div>
            ) : (
              <>
                <span className="w-10 h-10 rounded-full bg-sunken flex items-center justify-center text-ink-soft">
                  <UploadCloud className="w-5 h-5" aria-hidden="true" />
                </span>
                <p className="text-[14px] leading-[20px] font-medium text-ink">
                  Drag and drop your resume, or{" "}
                  <span className="text-primary underline">browse</span>
                </p>
                <p className="text-[12px] leading-[16px] text-ink-soft">
                  PDF or DOCX up to 5 MB
                </p>
              </>
            )}
          </div>
          {fieldErrors.file && (
            <p className="text-[12px] leading-[16px] text-danger">
              {fieldErrors.file}
            </p>
          )}
        </div>

        {/* Label input */}
        <Field
          label="Label"
          htmlFor="resume-upload-label"
          error={fieldErrors.label}
          helper="A short label to identify this resume."
        >
          <div className="relative">
            <Input
              ref={labelInputRef}
              id="resume-upload-label"
              type="text"
              disabled={isUploading}
              maxLength={RESUME_LABEL_MAX}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setLabelTouched(true);
                if (fieldErrors.label) {
                  setFieldErrors((prev) => ({ ...prev, label: "" }));
                }
              }}
              placeholder="e.g. Frontend Engineer 2026"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] leading-none text-ink-soft tabular-nums pointer-events-none select-none">
              {label.length} / {RESUME_LABEL_MAX}
            </span>
          </div>
        </Field>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-2 pt-2 border-t border-rule/60">
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isUploading || !file}
          >
            {isUploading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" />
                <span>Uploading</span>
              </span>
            ) : (
              "Upload resume"
            )}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export default UploadResumeDialog;
