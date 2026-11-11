/**
 * Resumes page component (/resumes)
 * Allows users to manage up to 5 resumes (PDF or DOCX).
 * Displays:
 * - Header with title "Resumes", tabular-nums counter "X of 5", and "Upload resume" button
 * - Limit tooltip / message when 5 of 5 is reached
 * - Loading skeleton, Error with retry, and Empty state
 * - Responsive grid of ResumeCard components
 */
import React, { useState } from "react";
import { Plus, UploadCloud } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { useResumes } from "../hooks/useResumes.js";
import { MAX_RESUMES_PER_USER } from "../lib/constants.js";
import { PageContainer } from "../components/layout/PageContainer.jsx";
import { PageHeader } from "../components/layout/PageHeader.jsx";
import { Button as MovingBorderButton } from "../registry/aceternity-ui/moving-border.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { ResumeCard } from "../components/resumes/ResumeCard.jsx";
import { ResumeCardSkeleton } from "../components/resumes/ResumeCardSkeleton.jsx";
import { UploadResumeDialog } from "../components/resumes/UploadResumeDialog.jsx";

export default function Resumes() {
  usePageTitle("Resumes");

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useResumes();

  const resumes = data?.resumes || [];
  const limit = data?.limit || MAX_RESUMES_PER_USER;
  const isAtLimit = resumes.length >= limit;

  return (
    <PageContainer>
      {/* Header with counter & upload action */}
      <PageHeader
        title="Resumes"
        subtitle={
          <span className="text-[14px] leading-[20px] text-ink-soft tabular-nums font-medium">
            {resumes.length} of {limit}
          </span>
        }
        actions={
          <div className="flex flex-col items-end gap-1">
            <MovingBorderButton
              duration={3000}
              borderRadius="1.75rem"
              containerClassName="w-44 h-9"
              className="text-sm font-medium text-white gap-1.5"
              disabled={isAtLimit}
              onClick={() => setIsUploadOpen(true)}
              title={
                isAtLimit
                  ? "You can keep up to 5 resumes. Delete one to add another."
                  : undefined
              }
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Upload resume</span>
            </MovingBorderButton>
            {isAtLimit && (
              <p
                role="status"
                className="text-[12px] leading-[16px] text-ink-soft text-right"
              >
                You can keep up to 5 resumes. Delete one to add another.
              </p>
            )}
          </div>
        }
      />

      {/* Main content body */}
      <div className="mt-6">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResumeCardSkeleton />
            <ResumeCardSkeleton />
          </div>
        )}

        {/* Error state */}
        {!isLoading && isError && (
          <ErrorState
            title="Couldn't load resumes"
            message={
              error?.message || "There was a problem loading your resumes."
            }
            onRetry={refetch}
          />
        )}

        {/* Empty state */}
        {!isLoading && !isError && resumes.length === 0 && (
          <EmptyState
            icon={UploadCloud}
            title="No resumes yet"
            description="Upload a PDF or DOCX resume up to 5 MB to use with applications."
            action={
              <MovingBorderButton
                duration={3000}
                borderRadius="1.75rem"
                containerClassName="w-44 h-9"
                className="text-sm font-medium text-white gap-1.5"
                onClick={() => setIsUploadOpen(true)}
              >
                <UploadCloud className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Upload resume</span>
              </MovingBorderButton>
            }
          />
        )}

        {/* Populated grid of resume cards */}
        {!isLoading && !isError && resumes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume._id || resume.id}
                resume={resume}
                otherResumesCount={resumes.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadResumeDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </PageContainer>
  );
}
