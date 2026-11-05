/**
 * ReplyForm component
 * Inline form for adding or editing a reply.
 * Handles client-side validation, server errors, keyboard navigation (Escape to cancel),
 * and focus management.
 */
import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button.jsx";
import { Field } from "../ui/Field.jsx";
import { Input } from "../ui/Input.jsx";
import { Select } from "../ui/Select.jsx";
import { Textarea } from "../ui/Textarea.jsx";
import { Checkbox } from "../ui/Checkbox.jsx";
import { LIMITS, REPLY_TYPES, REPLY_LABELS } from "../../lib/constants.js";
import {
  getLocalTodayString,
  dateToLocalNoonISO,
  deadlineToEndOfDayISO,
  isoToLocalDateInput,
} from "../../lib/applicationForm.js";
import { useReplyMutations } from "../../hooks/useReplyMutations.js";
import { cn } from "../../lib/cn.js";

export function ReplyForm({
  applicationId,
  initialReply = null,
  onClose,
  onSuccess,
  triggerRef,
  className = "",
}) {
  const isEdit = Boolean(initialReply);
  const { addReply, isAdding, updateReply, isUpdating } =
    useReplyMutations(applicationId);
  const isSubmitting = isAdding || isUpdating;

  const [type, setType] = useState(initialReply?.type || "assessment");
  const [receivedDate, setReceivedDate] = useState(() => {
    if (initialReply?.receivedDate) {
      return isoToLocalDateInput(initialReply.receivedDate);
    }
    return getLocalTodayString();
  });
  const [deadline, setDeadline] = useState(() => {
    if (initialReply?.deadline) {
      return isoToLocalDateInput(initialReply.deadline);
    }
    return "";
  });
  const [notes, setNotes] = useState(initialReply?.notes || "");
  const [completed, setCompleted] = useState(
    Boolean(initialReply?.completed)
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  const firstInputRef = useRef(null);
  const formRef = useRef(null);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const handleCancel = () => {
    onClose?.();
    if (triggerRef?.current) {
      setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!type) {
      errs.type = "Select a reply type.";
    }
    if (!receivedDate) {
      errs.receivedDate = "Pick the date you received this.";
    } else {
      const today = getLocalTodayString();
      if (receivedDate > today) {
        errs.receivedDate = "Received date cannot be in the future.";
      }
    }
    if (deadline && receivedDate) {
      if (deadline < receivedDate) {
        errs.deadline = "Deadline cannot be earlier than received date.";
      }
    }
    if (notes && notes.length > LIMITS.replyNotes) {
      errs.notes = `Notes cannot exceed ${LIMITS.replyNotes} characters.`;
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      if (isEdit) {
        const patch = {};
        if (type !== initialReply.type) patch.type = type;
        if (
          receivedDate !== isoToLocalDateInput(initialReply.receivedDate)
        ) {
          patch.receivedDate = dateToLocalNoonISO(receivedDate);
        }
        const initDeadline = isoToLocalDateInput(initialReply.deadline);
        if (deadline !== initDeadline) {
          patch.deadline = deadline ? deadlineToEndOfDayISO(deadline) : null;
        }
        if ((notes || "").trim() !== (initialReply.notes || "")) {
          patch.notes = notes.trim();
        }
        if (Boolean(completed) !== Boolean(initialReply.completed)) {
          patch.completed = completed;
        }

        if (Object.keys(patch).length === 0) {
          handleCancel();
          return;
        }

        const updated = await updateReply({
          replyId: initialReply._id,
          body: patch,
        });
        onSuccess?.(updated, "updated");
        handleCancel();
      } else {
        const payload = {
          type,
          receivedDate: dateToLocalNoonISO(receivedDate),
          notes: notes.trim(),
          completed,
        };
        if (deadline) {
          payload.deadline = deadlineToEndOfDayISO(deadline);
        }

        const updated = await addReply(payload);
        onSuccess?.(updated, "added");
        handleCancel();
      }
    } catch (err) {
      if (err?.errors && typeof err.errors === "object") {
        setErrors(err.errors);
      }
      setServerError(err.message || "Failed to save reply.");
    }
  };

  const showCompletedCheckbox =
    type === "assessment" ||
    type === "assignment" ||
    type === "interview" ||
    type === "other";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-[12px] bg-sunken border border-rule p-4 sm:p-5 flex flex-col gap-4 transition-colors",
        className
      )}
      aria-label={isEdit ? "Edit reply form" : "Add reply form"}
    >
      <div className="flex items-center justify-between pb-1 border-b border-rule/60">
        <h3 className="text-[16px] leading-[22px] font-semibold text-ink">
          {isEdit ? "Edit reply" : "Add reply"}
        </h3>
        <button
          type="button"
          onClick={handleCancel}
          className="text-[12px] font-medium text-ink-soft hover:text-ink px-2 py-0.5 rounded-[6px] hover:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-ink transition-colors cursor-pointer"
          aria-label="Cancel"
        >
          Cancel
        </button>
      </div>

      {serverError && (
        <div
          role="alert"
          className="px-3.5 py-2.5 rounded-[8px] bg-danger-bg border border-danger/30 text-[14px] leading-[20px] text-danger font-medium"
        >
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Reply Type */}
        <Field id="reply-type" label="Reply type" required error={errors.type}>
          <Select
            ref={firstInputRef}
            id="reply-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              if (errors.type) setErrors((prev) => ({ ...prev, type: null }));
            }}
          >
            {REPLY_TYPES.map((t) => (
              <option key={t} value={t}>
                {REPLY_LABELS[t] || t}
              </option>
            ))}
          </Select>
        </Field>

        {/* Received Date */}
        <Field
          id="reply-received"
          label="Received on"
          required
          error={errors.receivedDate}
        >
          <Input
            id="reply-received"
            type="date"
            max={getLocalTodayString()}
            value={receivedDate}
            onChange={(e) => {
              setReceivedDate(e.target.value);
              if (errors.receivedDate)
                setErrors((prev) => ({ ...prev, receivedDate: null }));
            }}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Deadline (optional) */}
        <Field
          id="reply-deadline"
          label="Deadline"
          hint="Optional"
          error={errors.deadline}
        >
          <Input
            id="reply-deadline"
            type="date"
            min={receivedDate || undefined}
            value={deadline}
            onChange={(e) => {
              setDeadline(e.target.value);
              if (errors.deadline)
                setErrors((prev) => ({ ...prev, deadline: null }));
            }}
          />
        </Field>

        {/* Completed checkbox (if applicable) */}
        {showCompletedCheckbox && (
          <div className="flex items-end pb-2">
            <Checkbox
              id="reply-completed"
              label="Already completed"
              checked={completed}
              onChange={setCompleted}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <Field
        id="reply-notes"
        label="Notes"
        hint="Optional details or next steps"
        error={errors.notes}
        counter={{ current: notes.length, max: LIMITS.replyNotes }}
      >
        <Textarea
          id="reply-notes"
          rows={2}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            if (errors.notes)
              setErrors((prev) => ({ ...prev, notes: null }));
          }}
          placeholder="e.g. 3 rounds scheduled, take-home in 48 hours"
        />
      </Field>

      <div className="flex items-center justify-end gap-2.5 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={isSubmitting}
        >
          {isEdit ? "Save changes" : "Add reply"}
        </Button>
      </div>
    </form>
  );
}

export default ReplyForm;