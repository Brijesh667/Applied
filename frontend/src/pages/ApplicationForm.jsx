/**
 * ApplicationForm page
 * Unified Add / Edit Application form route.
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { useApplication } from "../hooks/useApplication.js";
import { useSaveApplication } from "../hooks/useSaveApplication.js";
import { useResumes } from "../hooks/useResumes.js";
import {
  emptyValues,
  toFormValues,
  validate,
  toPayload,
  toPatch,
  mapServerErrors,
} from "../lib/applicationForm.js";
import { LIMITS } from "../lib/constants.js";
import { PageContainer } from "../components/layout/PageContainer.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { BackLink } from "../components/layout/BackLink.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { SegmentedControl } from "../components/applications/form/SegmentedControl.jsx";
import { MoneyInput } from "../components/applications/form/MoneyInput.jsx";
import { PlatformField } from "../components/applications/form/PlatformField.jsx";
import { SkillsField } from "../components/applications/form/SkillsField.jsx";
import { DateField } from "../components/applications/form/DateField.jsx";

const PAY_TYPE_OPTIONS = [
  { value: "yearly", label: "Yearly" },
  { value: "monthly", label: "Monthly" },
  { value: "onetime", label: "One-time" },
];

export default function ApplicationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  usePageTitle(isEdit ? "Edit application" : "Add application");

  // Query application details on edit
  const {
    data: application,
    isLoading: isLoadingApp,
    isError: isLoadError,
    error: loadError,
    refetch,
  } = useApplication(id);

  // Mutations
  const {
    createApplication,
    updateApplication,
    isSaving,
  } = useSaveApplication();

  // Form state
  const [values, setValues] = useState(() => emptyValues());
  const [errors, setErrors] = useState({});
  const [_touched, setTouched] = useState({});
  const [serverAlert, setServerAlert] = useState("");
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const initialValuesRef = useRef(emptyValues());
  const initializedRef = useRef(false);

  // Element refs for autofocus on failed submit
  const companyRef = useRef(null);
  const roleRef = useRef(null);
  const durationRef = useRef(null);
  const payAmountRef = useRef(null);
  const jobLinkRef = useRef(null);
  const appliedDateRef = useRef(null);

  // Populate form on edit load
  useEffect(() => {
    if (isEdit && application && !initializedRef.current) {
      const init = toFormValues(application);
      setValues(init);
      initialValuesRef.current = init;
      initializedRef.current = true;
    }
  }, [isEdit, application]);

  // Autofocus Company name on create
  useEffect(() => {
    if (!isEdit) {
      companyRef.current?.focus();
    }
  }, [isEdit]);

  // Resumes list for resume selection
  const { data: resumesData, isError: isResumesError } = useResumes();
  const resumesList = resumesData?.resumes || [];
  const defaultResume = resumesList.find((r) => r.isDefault);
  const defaultResumeId = defaultResume?._id || defaultResume?.id || "";
  const defaultPreselectedRef = useRef(false);

  // Preselect default resume on create if user has one and hasn't manually set it
  useEffect(() => {
    if (!isEdit && defaultResumeId && !defaultPreselectedRef.current) {
      defaultPreselectedRef.current = true;
      setValues((prev) => {
        if (!prev.resumeId) {
          initialValuesRef.current = {
            ...initialValuesRef.current,
            resumeId: defaultResumeId,
          };
          return { ...prev, resumeId: defaultResumeId };
        }
        return prev;
      });
    }
  }, [isEdit, defaultResumeId]);

  // Dirty check
  const isDirty = useMemo(() => {
    const init = initialValuesRef.current;
    return (
      values.companyName !== init.companyName ||
      values.role !== init.role ||
      values.platform !== init.platform ||
      values.platformOther !== init.platformOther ||
      values.payType !== init.payType ||
      values.payAmount !== init.payAmount ||
      values.duration !== init.duration ||
      values.skills !== init.skills ||
      values.description !== init.description ||
      values.notes !== init.notes ||
      values.jobLink !== init.jobLink ||
      values.appliedDate !== init.appliedDate ||
      values.resumeId !== init.resumeId
    );
  }, [values]);

  // Unsaved changes beforeunload handler
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Field change & blur handlers
  const handleFieldChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setServerAlert("");
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const allErrors = validate(values);
    setErrors((prev) => ({ ...prev, [field]: allErrors[field] || "" }));
  };

  // Safe navigation with unsaved changes prompt
  const handleSafeNavigate = (target) => {
    if (isDirty) {
      setPendingNavigation(target);
      setIsDiscardDialogOpen(true);
    } else {
      navigate(target);
    }
  };

  const handleCancel = () => {
    const defaultTarget = isEdit ? `/applications/${id}` : "/applications";
    handleSafeNavigate(defaultTarget);
  };

  const handleConfirmDiscard = () => {
    setIsDiscardDialogOpen(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setServerAlert("");

    // Full validation
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setTouched({
      companyName: true,
      role: true,
      platform: true,
      platformOther: true,
      payAmount: true,
      duration: true,
      skills: true,
      description: true,
      notes: true,
      jobLink: true,
      appliedDate: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      // Focus first invalid field
      if (validationErrors.companyName) companyRef.current?.focus();
      else if (validationErrors.role) roleRef.current?.focus();
      else if (validationErrors.platform || validationErrors.platformOther) {
        // Platform focus handled by platform component
      } else if (validationErrors.payAmount) payAmountRef.current?.focus();
      else if (validationErrors.duration) durationRef.current?.focus();
      else if (validationErrors.jobLink) jobLinkRef.current?.focus();
      else if (validationErrors.appliedDate) appliedDateRef.current?.focus();
      return;
    }

    try {
      if (!isEdit) {
        const payload = toPayload(values);
        await createApplication(payload);
      } else {
        const patch = toPatch(values, initialValuesRef.current);
        if (Object.keys(patch).length === 0) {
          navigate(`/applications/${id}`);
          return;
        }
        await updateApplication({ id, body: patch });
      }
    } catch (err) {
      if (err?.status === 400 && err?.fieldErrors) {
        const mapped = mapServerErrors(err.fieldErrors, values.platform);
        setErrors(mapped);
      } else {
        setServerAlert(
          err?.message || "Can't reach the server. Check your connection and try again."
        );
      }
    }
  };

  // Loading skeleton on edit
  if (isEdit && isLoadingApp) {
    return (
      <PageContainer>
        <BackLink to="/applications">Back to applications</BackLink>
        <PageHeader title="Edit application" />
        <div className="max-w-[720px] mx-auto rounded-[12px] bg-surface border border-rule p-6 sm:p-8 space-y-6">
          <Skeleton className="h-6 w-32 rounded-[4px]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full rounded-[8px]" />
            <Skeleton className="h-10 w-full rounded-[8px]" />
          </div>
          <div className="border-t border-rule pt-6 space-y-4">
            <Skeleton className="h-6 w-40 rounded-[4px]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full rounded-[8px]" />
              <Skeleton className="h-10 w-full rounded-[8px]" />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Not found or error loading application on edit
  if (isEdit && isLoadError) {
    const isNotFound = loadError?.status === 404 || loadError?.status === 400;
    return (
      <PageContainer>
        <BackLink to="/applications">Back to applications</BackLink>
        <div className="max-w-[720px] mx-auto mt-6">
          {isNotFound ? (
            <ErrorState
              title="Application not found"
              message="It may have been deleted or the link is invalid."
              action={
                <Link to="/applications">
                  <Button variant="secondary" size="sm">
                    Back to applications
                  </Button>
                </Link>
              }
            />
          ) : (
            <ErrorState
              title="Can't load application"
              message={loadError?.message || "Can't reach the server."}
              onRetry={refetch}
            />
          )}
        </div>
      </PageContainer>
    );
  }

  const backLinkTarget = isEdit ? `/applications/${id}` : "/applications";
  const backLinkLabel = isEdit ? "Back to application" : "Back to applications";

  return (
    <PageContainer>
      {/* BackLink with dirty interception */}
      <div className="mb-2">
        <button
          type="button"
          onClick={() => handleSafeNavigate(backLinkTarget)}
          className="inline-flex items-center gap-1.5 text-[14px] leading-[20px] font-medium text-ink-soft hover:text-ink transition-colors mb-4 focus:outline-none focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 rounded-[6px] select-none cursor-pointer"
        >
          &larr; {backLinkLabel}
        </button>
      </div>

      <PageHeader
        title={isEdit ? "Edit application" : "Add application"}
        description={
          !isEdit
            ? "Log where you applied so you never lose track of it."
            : undefined
        }
      />

      <div className="max-w-[720px] mx-auto rounded-[12px] bg-surface border border-rule p-6 sm:p-8">
        {serverAlert && (
          <div
            role="alert"
            className="p-3 rounded-[8px] bg-danger-bg text-danger text-[14px] leading-[20px] font-medium mb-6"
          >
            <span>{serverAlert}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* GROUP 1: Role */}
          <section>
            <h2 className="text-[22px] leading-[28px] font-bold text-ink mb-4">
              Role
            </h2>

            <div className="space-y-4">
              {/* Row: Company Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  id="app-company"
                  label="Company name"
                  error={errors.companyName}
                  counter={{
                    current: values.companyName.length,
                    max: LIMITS.companyName,
                  }}
                >
                  <Input
                    ref={companyRef}
                    id="app-company"
                    value={values.companyName}
                    disabled={isSaving}
                    placeholder="e.g. Google, Tata Consultancy"
                    onChange={(e) =>
                      handleFieldChange("companyName", e.target.value)
                    }
                    onBlur={() => handleBlur("companyName")}
                  />
                </Field>

                <Field
                  id="app-role"
                  label="Role"
                  error={errors.role}
                  counter={{
                    current: values.role.length,
                    max: LIMITS.role,
                  }}
                >
                  <Input
                    ref={roleRef}
                    id="app-role"
                    value={values.role}
                    disabled={isSaving}
                    placeholder="e.g. Frontend Engineer Intern"
                    onChange={(e) => handleFieldChange("role", e.target.value)}
                    onBlur={() => handleBlur("role")}
                  />
                </Field>
              </div>

              {/* Row: Platform & Applied on */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlatformField
                  platform={values.platform}
                  platformOther={values.platformOther}
                  onChangePlatform={(val) => handleFieldChange("platform", val)}
                  onChangePlatformOther={(val) =>
                    handleFieldChange("platformOther", val)
                  }
                  onBlurPlatform={() => handleBlur("platform")}
                  onBlurPlatformOther={() => handleBlur("platformOther")}
                  platformError={errors.platform}
                  platformOtherError={errors.platformOther}
                  disabled={isSaving}
                />

                <Field
                  id="app-applied-date"
                  label="Applied on"
                  error={errors.appliedDate}
                >
                  <DateField
                    ref={appliedDateRef}
                    id="app-applied-date"
                    value={values.appliedDate}
                    disabled={isSaving}
                    onChange={(val) => handleFieldChange("appliedDate", val)}
                    onBlur={() => handleBlur("appliedDate")}
                  />
                </Field>
              </div>

              {/* Job link (optional) */}
              <Field
                id="app-job-link"
                label="Job link (optional)"
                error={errors.jobLink}
                counter={{
                  current: values.jobLink.length,
                  max: LIMITS.jobLink,
                }}
              >
                <Input
                  ref={jobLinkRef}
                  id="app-job-link"
                  type="url"
                  placeholder="https://"
                  value={values.jobLink}
                  disabled={isSaving}
                  onChange={(e) => handleFieldChange("jobLink", e.target.value)}
                  onBlur={() => handleBlur("jobLink")}
                />
              </Field>
            </div>
          </section>

          {/* GROUP 2: Pay and duration */}
          <section className="border-t border-rule pt-6">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink mb-4">
              Pay and duration
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pay Type Segmented Control */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[14px] leading-[20px] font-medium text-ink select-none">
                    Pay type
                  </span>
                  <SegmentedControl
                    name="payType"
                    options={PAY_TYPE_OPTIONS}
                    value={values.payType}
                    disabled={isSaving}
                    onChange={(val) => handleFieldChange("payType", val)}
                    className="w-full"
                  />
                </div>

                {/* Amount */}
                <Field
                  id="app-pay-amount"
                  label="Amount"
                  error={errors.payAmount}
                >
                  <MoneyInput
                    ref={payAmountRef}
                    id="app-pay-amount"
                    value={values.payAmount}
                    payType={values.payType}
                    disabled={isSaving}
                    onChange={(val) => handleFieldChange("payAmount", val)}
                    onBlur={() => handleBlur("payAmount")}
                  />
                </Field>
              </div>

              {/* Duration */}
              <Field
                id="app-duration"
                label="Duration"
                error={errors.duration}
                hint="How long the role runs, for example 6 months."
                counter={{
                  current: values.duration.length,
                  max: LIMITS.duration,
                }}
              >
                <Input
                  ref={durationRef}
                  id="app-duration"
                  placeholder="e.g. 6 months"
                  value={values.duration}
                  disabled={isSaving}
                  onChange={(e) => handleFieldChange("duration", e.target.value)}
                  onBlur={() => handleBlur("duration")}
                />
              </Field>
            </div>
          </section>

          {/* GROUP 3: Details */}
          <section className="border-t border-rule pt-6">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink mb-4">
              Details
            </h2>

            <div className="space-y-4">
              {/* Skills */}
              <SkillsField
                value={values.skills}
                disabled={isSaving}
                onChange={(val) => handleFieldChange("skills", val)}
                onBlur={() => handleBlur("skills")}
                error={errors.skills}
              />

              {/* Description */}
              <Field
                id="app-description"
                label="Description (optional)"
                error={errors.description}
                counter={{
                  current: values.description.length,
                  max: LIMITS.description,
                }}
              >
                <Textarea
                  id="app-description"
                  rows={4}
                  value={values.description}
                  disabled={isSaving}
                  placeholder="Job overview, responsibilities, or requirements..."
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                  onBlur={() => handleBlur("description")}
                />
              </Field>

              {/* Notes */}
              <Field
                id="app-notes"
                label="Notes (optional)"
                error={errors.notes}
                hint="Only you can see these."
                counter={{
                  current: values.notes.length,
                  max: LIMITS.notes,
                }}
              >
                <Textarea
                  id="app-notes"
                  rows={3}
                  value={values.notes}
                  disabled={isSaving}
                  placeholder="Referral contacts, prep notes, or thoughts..."
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  onBlur={() => handleBlur("notes")}
                />
              </Field>

              {/* Resume used */}
              {!isResumesError && (
                <div>
                  {resumesList.length === 0 ? (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="text-[14px] leading-[20px] font-medium text-ink select-none">
                        Resume used (optional)
                      </span>
                      <p className="text-[13px] leading-[18px] text-ink-soft">
                        No resumes saved.{" "}
                        <Link
                          to="/resumes"
                          className="text-primary hover:underline font-medium"
                        >
                          Add a resume
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <Field
                      id="app-resume-used"
                      label="Resume used (optional)"
                      hint="Select which resume you submitted with this application."
                    >
                      <Select
                        id="app-resume-used"
                        value={values.resumeId}
                        disabled={isSaving}
                        onChange={(e) =>
                          handleFieldChange("resumeId", e.target.value)
                        }
                      >
                        <option value="">No resume</option>
                        {resumesList.map((r) => {
                          const rId = r._id || r.id;
                          return (
                            <option key={rId} value={rId}>
                              {r.label || r.fileName}{" "}
                              {r.isDefault ? "(Default)" : ""}
                            </option>
                          );
                        })}
                      </Select>
                    </Field>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ACTIONS: Cancel & Submit (Right-aligned desktop, stacked full-width mobile primary first) */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 mt-8 pt-6 border-t border-rule">
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={isSaving}
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSaving}
              disabled={isSaving || (isEdit && !isDirty)}
            >
              {isEdit ? "Save changes" : "Save application"}
            </Button>
          </div>
        </form>
      </div>

      {/* Discard changes dialog */}
      <ConfirmDialog
        isOpen={isDiscardDialogOpen}
        title="Discard changes?"
        description="Your edits to this application will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        danger
        onConfirm={handleConfirmDiscard}
        onCancel={() => {
          setIsDiscardDialogOpen(false);
          setPendingNavigation(null);
        }}
      />
    </PageContainer>
  );
}
