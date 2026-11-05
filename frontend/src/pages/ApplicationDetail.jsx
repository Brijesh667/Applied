/**
 * ApplicationDetail page
 * Displays complete application information:
 * - Back link and compact header: company name + inline StatusBadge, muted role, edit/delete actions
 * - Two-column responsive layout: DetailsPanel (col-5, sticky on desktop when fitting) and RepliesPanel (col-7)
 * - Delete application confirmation dialog with cache cleanup & navigation
 * - Skeleton loading & error states
 */
import React, { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useApplication } from "../hooks/useApplication.js";
import { useDeleteApplication } from "../hooks/useDeleteApplication.js";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { PageContainer } from "../components/layout/PageContainer.jsx";
import { BackLink } from "../components/layout/BackLink.jsx";
import { Button } from "../components/ui/Button.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { DetailsPanel } from "../components/applications/DetailsPanel.jsx";
import { RepliesPanel } from "../components/applications/RepliesPanel.jsx";
import { cn } from "../lib/cn.js";

export default function ApplicationDetail() {
  const { id } = useParams();
  const { data: application, isLoading, isError, error, refetch } =
    useApplication(id);
  const { deleteApplication, isDeleting: isDeletingApp } =
    useDeleteApplication();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const detailsRef = useRef(null);
  const [isStickyAllowed, setIsStickyAllowed] = useState(false);

  const pageTitle = application
    ? `${application.companyName} | Application details`
    : "Application details";
  usePageTitle(pageTitle);

  // Measure if DetailsPanel fits inside viewport to allow sticky
  useEffect(() => {
    if (!application) return;

    const checkStickyHeight = () => {
      if (!detailsRef.current) return;
      const topbarHeight = window.innerWidth >= 768 ? 64 : 56;
      const panelHeight = detailsRef.current.offsetHeight;
      const availableHeight = window.innerHeight - topbarHeight - 32;
      setIsStickyAllowed(panelHeight > 0 && panelHeight < availableHeight);
    };

    checkStickyHeight();
    window.addEventListener("resize", checkStickyHeight);
    return () => window.removeEventListener("resize", checkStickyHeight);
  }, [application]);

  const handleDeleteApplication = async () => {
    try {
      await deleteApplication(id);
    } catch {
      // Handled in hook toast
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <BackLink to="/applications" className="mb-3">
          Back to applications
        </BackLink>

        {/* Skeleton Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-52 rounded-[6px]" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-5 w-36 rounded-[4px]" />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-10 w-20 rounded-[8px]" />
            <Skeleton className="h-10 w-24 rounded-[8px]" />
          </div>
        </div>

        {/* Skeleton Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
          <div className="lg:col-span-5">
            <div className="rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-4">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full rounded-[4px]" />
                <Skeleton className="h-10 w-full rounded-[4px]" />
                <Skeleton className="h-10 w-full rounded-[4px]" />
                <Skeleton className="h-10 w-full rounded-[4px]" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="rounded-[12px] bg-surface border border-rule p-5 sm:p-6 space-y-4">
              <Skeleton className="h-6 w-28 mb-4" />
              <Skeleton className="h-20 w-full rounded-[10px]" />
              <Skeleton className="h-20 w-full rounded-[10px]" />
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isError || !application) {
    const is404 =
      error?.status === 404 ||
      error?.message?.toLowerCase().includes("not found");

    return (
      <PageContainer>
        <BackLink to="/applications" className="mb-3">
          Back to applications
        </BackLink>
        <div className="py-12">
          {is404 ? (
            <ErrorState
              title="Application not found"
              description="The application you're looking for doesn't exist or has been removed."
              action={
                <Link
                  to="/applications"
                  className="inline-flex items-center justify-center font-medium transition-colors duration-120 rounded-[8px] bg-ink text-paper hover:opacity-90 h-10 px-4 text-[16px]"
                >
                  Back to applications
                </Link>
              }
            />
          ) : (
            <ErrorState
              title="Couldn't load application"
              description={error?.message || "An unexpected error occurred."}
              action={
                <Button onClick={() => refetch()} variant="secondary">
                  Try again
                </Button>
              }
            />
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* 2. Compact Header: BackLink on top, then row with company name + StatusBadge right next to it, role below */}
      <div className="mb-6">
        <BackLink to="/applications" className="mb-3">
          Back to applications
        </BackLink>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title + inline StatusBadge, muted role below */}
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[26px] sm:text-[30px] leading-[34px] sm:leading-[38px] font-bold text-ink tracking-[-0.015em] break-words">
                {application.companyName}
              </h1>
              <StatusBadge status={application.status} className="shrink-0" />
            </div>
            {application.role && (
              <p className="text-[15px] sm:text-[16px] leading-[22px] sm:leading-[24px] text-ink-soft mt-1">
                {application.role}
              </p>
            )}
          </div>

          {/* Edit and Delete buttons: right on desktop, full-width row below title on mobile */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Link
              to={`/applications/${id}/edit`}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center font-medium transition-colors duration-120 rounded-[8px] cursor-pointer bg-surface text-ink border border-rule hover:bg-sunken active:bg-sunken/80 h-10 px-4 text-[15px] leading-[22px] select-none"
              aria-label={`Edit ${application.companyName} application`}
            >
              <span>Edit</span>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(true)}
              className="flex-1 sm:flex-initial text-danger hover:text-danger hover:bg-danger-bg border-rule h-10 px-4"
              aria-label={`Delete ${application.companyName} application`}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout: Details (5 cols) & Replies (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Details Column: sticky on desktop (lg) if fitting in viewport */}
        <div
          ref={detailsRef}
          className={cn(
            "lg:col-span-5",
            isStickyAllowed && "lg:sticky lg:top-[calc(var(--topbar-h)+1rem)] z-10"
          )}
        >
          <DetailsPanel application={application} />
        </div>

        {/* Replies Column */}
        <div className="lg:col-span-7">
          <RepliesPanel application={application} />
        </div>
      </div>

      {/* Delete Application Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title={`Delete ${application.companyName} application?`}
        description="This will permanently delete this application and all associated replies. This action cannot be undone."
        confirmLabel="Delete application"
        cancelLabel="Cancel"
        danger={true}
        loading={isDeletingApp}
        onConfirm={handleDeleteApplication}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </PageContainer>
  );
}
