/**
 * ResumeCard component
 * Displays a single resume with:
 * - Prominent label, file name, file type, file size, uploaded date
 * - Default badge (ink style, never yellow highlighter)
 * - Parse status badge / section:
 *   - pending: spinner + "Reading resume" (or stale warning "This is taking longer than usual" with "Read again")
 *   - done: skills (first 6 chips, "+N more"), target roles, experience years, location
 *   - failed: specific friendly error message by parseError code + "Read again"
 * - Actions menu / buttons: Download (view file), Edit details, Make default, Read again, Delete
 */
import React, { useState } from "react";
import {
  FileText,
  MoreVertical,
  Download,
  Edit2,
  CheckCircle2,
  RotateCcw,
  Trash2,
  AlertCircle,
  MapPin,
  Briefcase,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Menu, MenuTrigger, MenuContent, MenuItem } from "../ui/Menu.jsx";
import { Button } from "../ui/Button.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { ConfirmDialog } from "../ui/ConfirmDialog.jsx";
import { EditResumeDialog } from "./EditResumeDialog.jsx";
import { formatDate, formatBytes } from "../../lib/format.js";
import { RESUME_PARSE_STALE_MS } from "../../lib/constants.js";
import { useResumeDownload } from "../../hooks/useResumeDownload.js";
import { useUpdateResume } from "../../hooks/useUpdateResume.js";
import { useDeleteResume } from "../../hooks/useDeleteResume.js";
import { useReparseResume } from "../../hooks/useReparseResume.js";
import { cn } from "../../lib/cn.js";

function getParseErrorMessage(parseError) {
  if (parseError === "no_text") {
    return "We couldn't read text from this file. It may be a scanned image. You can add skills yourself.";
  }
  return "We couldn't read this resume right now. Try again, or add skills yourself.";
}

export function ResumeCard({ resume, otherResumesCount = 0 }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { download, isDownloading } = useResumeDownload();
  const { mutateAsync: updateResume, isPending: isUpdating } = useUpdateResume();
  const { mutateAsync: deleteResume, isPending: isDeleting } = useDeleteResume();
  const { mutateAsync: reparseResume, isPending: isReparsing } = useReparseResume();

  const id = resume._id || resume.id;
  const isDefault = Boolean(resume.isDefault);
  const isPending = resume.parseStatus === "pending";
  const isDone = resume.parseStatus === "done";
  const isFailed = resume.parseStatus === "failed";

  // Check if pending is stale (> 2 minutes)
  const pendingTimestamp =
    resume.parseStartedAt || resume.updatedAt || resume.createdAt;
  const isStale =
    isPending &&
    pendingTimestamp &&
    Date.now() - new Date(pendingTimestamp).getTime() > RESUME_PARSE_STALE_MS;

  const handleMakeDefault = async () => {
    if (isDefault || isUpdating) return;
    try {
      await updateResume({ id, body: { isDefault: true } });
      toast.success("Default resume updated");
    } catch (_err) {
      toast.error("Could not set as default. Try again.");
    }
  };

  const handleReparse = async () => {
    if (isReparsing) return;
    try {
      await reparseResume(id);
      toast.success("Reading resume again");
    } catch (err) {
      const msg = err?.message || "Could not re-read resume. Try again.";
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteResume(id);
      toast.success("Resume deleted");
      setIsDeleteDialogOpen(false);
    } catch (_err) {
      toast.error("Could not delete resume. Try again.");
    }
  };

  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  const visibleSkills = skills.slice(0, 6);
  const remainingSkillsCount = skills.length - visibleSkills.length;

  const roleTitles = Array.isArray(resume.roleTitles) ? resume.roleTitles : [];

  const deleteDialogDescription = isDefault && otherResumesCount > 0
    ? "Delete this resume? The file is removed permanently. Applications that used it will stay, but will no longer be linked to a resume. Your newest remaining resume becomes the default."
    : "Delete this resume? The file is removed permanently. Applications that used it will stay, but will no longer be linked to a resume.";

  return (
    <article
      className={cn(
        "rounded-[12px] bg-surface border border-rule p-5 flex flex-col justify-between transition-all select-none relative",
        isDefault && "border-rule/90 shadow-[0_2px_12px_rgb(0_0_0_/_0.04)]"
      )}
    >
      <div>
        {/* Top row: Label, Default badge, File type & Actions menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className="text-[17px] leading-[22px] font-bold text-ink truncate">
                {resume.label || resume.fileName}
              </h3>
              {isDefault && (
                <span
                  title="Default resume"
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] leading-[14px] font-semibold bg-sunken text-ink border border-rule/80 select-none"
                >
                  Default
                </span>
              )}
            </div>

            {/* File metadata row */}
            <p className="text-[13px] leading-[18px] text-ink-soft flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <span className="truncate max-w-[200px]" title={resume.fileName}>
                {resume.fileName}
              </span>
              <span aria-hidden="true" className="text-rule">•</span>
              <span className="uppercase text-[11px] font-semibold tracking-wider">
                {resume.fileType}
              </span>
              <span aria-hidden="true" className="text-rule">•</span>
              <span className="tabular-nums">{formatBytes(resume.fileSize)}</span>
              <span aria-hidden="true" className="text-rule">•</span>
              <span>Uploaded {formatDate(resume.createdAt)}</span>
            </p>
          </div>

          {/* Action Menu */}
          <div className="flex items-center gap-1 shrink-0">
            {isUpdating && (
              <span className="p-1" title="Updating...">
                <Spinner size="sm" />
              </span>
            )}
            <Menu>
              <MenuTrigger>
                <button
                  type="button"
                  aria-label={`Actions for resume ${resume.label || resume.fileName}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-ink-soft hover:text-ink hover:bg-sunken transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary select-none"
                >
                  <MoreVertical className="w-4 h-4" aria-hidden="true" />
                </button>
              </MenuTrigger>
              <MenuContent align="right">
                <MenuItem
                  icon={Download}
                  disabled={isDownloading}
                  onClick={() => download(id)}
                >
                  {isDownloading ? "Opening file..." : "Download file"}
                </MenuItem>
                <MenuItem icon={Edit2} onClick={() => setIsEditDialogOpen(true)}>
                  Edit details
                </MenuItem>
                {!isDefault && (
                  <MenuItem
                    icon={CheckCircle2}
                    disabled={isUpdating}
                    onClick={handleMakeDefault}
                  >
                    Make default
                  </MenuItem>
                )}
                {(isFailed || isStale) && (
                  <MenuItem
                    icon={RotateCcw}
                    disabled={isReparsing}
                    onClick={handleReparse}
                  >
                    Read again
                  </MenuItem>
                )}
                <MenuItem
                  icon={Trash2}
                  danger
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Delete resume
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>

        {/* Parse Status / Content Section */}
        <div className="mt-4 pt-3.5 border-t border-rule/60">
          {/* Pending state */}
          {isPending && !isStale && (
            <div
              aria-live="polite"
              className="flex items-center gap-2.5 py-1 text-[13px] leading-[18px] text-ink-soft"
            >
              <Spinner size="sm" />
              <span>Reading resume</span>
            </div>
          )}

          {/* Stale Pending state */}
          {isPending && isStale && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-[8px] bg-sunken/60 border border-rule/80 text-[13px] leading-[18px]">
              <div className="flex items-center gap-2 text-ink-soft">
                <Clock className="w-4 h-4 text-ink-soft shrink-0" aria-hidden="true" />
                <span>This is taking longer than usual</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={isReparsing}
                onClick={handleReparse}
                className="shrink-0 self-start sm:self-auto"
              >
                Read again
              </Button>
            </div>
          )}

          {/* Failed state */}
          {isFailed && (
            <div className="flex flex-col gap-2 p-3 rounded-[8px] bg-sunken/50 border border-rule/80 text-[13px] leading-[18px]">
              <div className="flex items-start gap-2 text-ink-soft">
                <AlertCircle className="w-4 h-4 text-ink-soft shrink-0 mt-0.5" aria-hidden="true" />
                <p>{getParseErrorMessage(resume.parseError)}</p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={isReparsing}
                  onClick={handleReparse}
                >
                  Read again
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  Add skills manually
                </Button>
              </div>
            </div>
          )}

          {/* Done state */}
          {isDone && (
            <div className="flex flex-col gap-2.5">
              {/* Skills */}
              {skills.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {visibleSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] leading-[16px] bg-sunken text-ink-soft border border-rule/60 select-none"
                    >
                      {skill}
                    </span>
                  ))}
                  {remainingSkillsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="text-[12px] leading-[16px] text-ink-soft font-medium hover:text-ink hover:underline cursor-pointer px-1 select-none"
                    >
                      +{remainingSkillsCount} more
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[13px] leading-[18px] text-ink-soft italic">
                  No skills detected.{" "}
                  <button
                    type="button"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="text-primary hover:underline not-italic cursor-pointer"
                  >
                    Add skills
                  </button>
                </p>
              )}

              {/* Roles, Experience, and Location info line */}
              {(roleTitles.length > 0 ||
                resume.experienceYears !== null ||
                resume.locationPreference) && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[12px] leading-[16px] text-ink-soft pt-1">
                  {roleTitles.length > 0 && (
                    <span className="flex items-center gap-1 truncate max-w-[260px]">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{roleTitles.join(", ")}</span>
                    </span>
                  )}
                  {resume.experienceYears !== null &&
                    resume.experienceYears !== undefined && (
                      <span className="flex items-center gap-1">
                        <span aria-hidden="true" className="text-rule">•</span>
                        <span className="tabular-nums">
                          {resume.experienceYears === 0
                            ? "Fresher / Student"
                            : `${resume.experienceYears} yr${
                                resume.experienceYears === 1 ? "" : "s"
                              } exp`}
                        </span>
                      </span>
                    )}
                  {resume.locationPreference && (
                    <span className="flex items-center gap-1">
                      <span aria-hidden="true" className="text-rule">•</span>
                      <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{resume.locationPreference}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-rule/60 text-[13px]">
        <button
          type="button"
          disabled={isDownloading}
          onClick={() => download(id)}
          className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-primary transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px]"
        >
          <FileText className="w-4 h-4 text-ink-soft" aria-hidden="true" />
          <span>{isDownloading ? "Opening..." : "View file"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsEditDialogOpen(true)}
          className="inline-flex items-center gap-1 font-medium text-ink-soft hover:text-ink transition-colors cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-primary rounded-[4px]"
        >
          <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Edit</span>
        </button>
      </div>

      {/* Edit Details Dialog */}
      <EditResumeDialog
        resume={resume}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete this resume?"
        description={deleteDialogDescription}
        confirmLabel="Delete"
        danger
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </article>
  );
}

export default ResumeCard;
