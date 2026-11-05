/**
 * Styleguide page (development only)
 * Visual reference and interactive test bench for the Applied design system.
 */
import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { APP_NAME } from "../lib/brand.js";
import { Logo } from "../components/ui/Logo.jsx";
import { Button } from "../components/ui/Button.jsx";
import { IconButton } from "../components/ui/IconButton.jsx";
import { SegmentedControl } from "../components/applications/form/SegmentedControl.jsx";
import { ApplicationCard } from "../components/applications/ApplicationCard.jsx";
import { useCardSpotlight } from "../hooks/useCardSpotlight.js";
import { Field } from "../components/ui/Field.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Textarea } from "../components/ui/Textarea.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Checkbox } from "../components/ui/Checkbox.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ReplyTypeBadge } from "../components/ui/ReplyTypeBadge.jsx";
import { DueChip } from "../components/ui/DueChip.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ErrorState } from "../components/ui/ErrorState.jsx";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.jsx";
import { STATUSES, REPLY_TYPES, PLATFORMS } from "../lib/constants.js";
import { usePageTitle } from "../hooks/usePageTitle.js";

export default function Styleguide() {
  usePageTitle("Styleguide");
  const { theme, toggleTheme } = useTheme();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogLoading, setIsDialogLoading] = useState(false);

  // Form controls state
  const [companyName, setCompanyName] = useState("Google");
  const [role, setRole] = useState("Software Engineer - Frontend Systems");
  const [notes, setNotes] = useState(
    "Spoke with the recruiter on LinkedIn. Follow-up expected next Tuesday."
  );
  const [platform, setPlatform] = useState("LinkedIn");
  const [isChecked1, setIsChecked1] = useState(false);
  const [isChecked2, setIsChecked2] = useState(true);

  // Sample dates for DueChip
  const now = new Date();
  const overdueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const dueTodayDate = now.toISOString();
  const dueSoonDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const laterDate = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString();

  // Interaction state (Part 10)
  const [segmentedVal, setSegmentedVal] = useState("all");
  const sampleCardGridRef = useRef(null);
  useCardSpotlight(sampleCardGridRef);

  const sampleCardData = {
    _id: "styleguide-sample-app",
    companyName: "Stripe India",
    role: "Staff Frontend Infrastructure Engineer",
    status: "in-process",
    appliedFrom: "LinkedIn",
    pay: 3800000,
    duration: "Full-time",
    appliedDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    skills: "React, TypeScript, CSS Architecture, Performance, Vite",
    replies: [
      {
        _id: "reply-sample-1",
        type: "Interview",
        receivedDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    nextDeadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const handleConfirm = () => {
    setIsDialogLoading(true);
    setTimeout(() => {
      setIsDialogLoading(false);
      setIsDialogOpen(false);
      toast.success("Application deleted");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-paper text-ink transition-colors duration-120">
      {/* Top Bar */}
      <header className="border-b border-rule bg-surface sticky top-0 z-20">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-sunken text-ink-soft border border-rule">
              Design System & Styleguide
            </span>
          </div>

          <button
            type="button"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center text-ink hover:bg-sunken rounded-[8px] border border-rule transition-colors cursor-pointer select-none"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-12">
        {/* Section: Philosophy */}
        <section className="flex flex-col gap-2 max-w-[65ch]">
          <h1 className="text-[36px] leading-[42px] font-extrabold tracking-[-0.02em] text-ink">
            {APP_NAME} Design System
          </h1>
          <p className="text-[18px] leading-[26px] text-ink-soft">
            A calm, quiet logbook aesthetic inspired by navy and blue tones with careful records.
          </p>
        </section>

        {/* Section: Color Tokens */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Color tokens
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Active theme: <strong className="text-ink font-semibold">{theme}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { token: "paper", label: "Page background", bg: "bg-paper", text: "text-ink", border: "border-rule" },
              { token: "surface", label: "Cards, panels", bg: "bg-surface", text: "text-ink", border: "border-rule" },
              { token: "sunken", label: "Wells, hover rows", bg: "bg-sunken", text: "text-ink", border: "border-rule" },
              { token: "rule", label: "Borders, dividers", bg: "bg-rule", text: "text-ink", border: "border-rule" },
              { token: "ink", label: "Primary text", bg: "bg-ink", text: "text-paper", border: "border-transparent" },
              { token: "ink-soft", label: "Secondary text", bg: "bg-ink-soft", text: "text-paper", border: "border-transparent" },
              { token: "primary", label: "Brand, focus, buttons", bg: "bg-primary", text: "text-on-primary", border: "border-transparent" },
              { token: "primary-soft", label: "Soft tint", bg: "bg-primary-soft", text: "text-primary", border: "border-primary-tint" },
              { token: "danger", label: "Errors, missed", bg: "bg-danger", text: "text-paper", border: "border-transparent" },
              { token: "danger-bg", label: "Error tint", bg: "bg-danger-bg", text: "text-danger", border: "border-danger/20" },
            ].map((swatch) => (
              <div
                key={swatch.token}
                className="p-3 rounded-[8px] bg-surface border border-rule flex flex-col gap-2"
              >
                <div
                  className={`w-full h-12 rounded-[6px] border ${swatch.border} ${swatch.bg} flex items-center justify-center font-medium text-[12px] ${swatch.text}`}
                >
                  {swatch.token}
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-ink leading-tight">
                    {swatch.token}
                  </span>
                  <span className="text-[12px] text-ink-soft leading-tight">
                    {swatch.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Typography */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Typography scale
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Schibsted Grotesk (Variable). Sentence case everywhere. Tabular numbers enabled on metrics.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-surface border border-rule flex flex-col gap-6">
            <div className="flex flex-col gap-1 border-b border-rule pb-4">
              <span className="text-[12px] font-medium text-ink-soft">stat (48 / 52, weight 800, tabular)</span>
              <span className="text-[48px] leading-[52px] font-extrabold tracking-[-0.02em] tnum text-ink">
                ₹18,50,000 · 84.6% · 42
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-rule pb-4">
              <span className="text-[12px] font-medium text-ink-soft">h1 (36 / 42, weight 800)</span>
              <h1 className="text-[36px] leading-[42px] font-extrabold tracking-[-0.02em] text-ink">
                Track every application and deadline
              </h1>
            </div>

            <div className="flex flex-col gap-1 border-b border-rule pb-4">
              <span className="text-[12px] font-medium text-ink-soft">h2 (28 / 34, weight 700)</span>
              <h2 className="text-[28px] leading-[34px] font-bold tracking-[-0.015em] text-ink">
                Weekly progress overview
              </h2>
            </div>

            <div className="flex flex-col gap-1 border-b border-rule pb-4">
              <span className="text-[12px] font-medium text-ink-soft">h3 (22 / 28, weight 700)</span>
              <h3 className="text-[22px] leading-[28px] font-bold tracking-[-0.01em] text-ink">
                Upcoming assignments and interviews
              </h3>
            </div>

            <div className="flex flex-col gap-1 border-b border-rule pb-4">
              <span className="text-[12px] font-medium text-ink-soft">lead (18 / 26, weight 400)</span>
              <p className="text-[18px] leading-[26px] text-ink">
                A clean log of job submissions, online assessments, and interview stages.
              </p>
            </div>

            <div className="flex flex-col gap-1 border-b border-rule pb-4">
              <span className="text-[12px] font-medium text-ink-soft">body (16 / 24, weight 400)</span>
              <p className="text-[16px] leading-[24px] text-ink">
                Body copy is disciplined and legible. Body text must meet WCAG AA (4.5:1) on its background in both themes.
              </p>
            </div>

            <div className="flex flex-col gap-1 border-b border-rule pb-4">
              <span className="text-[12px] font-medium text-ink-soft">small (14 / 20, weight 400)</span>
              <p className="text-[14px] leading-[20px] text-ink-soft">
                Applied from LinkedIn · Full-time · Last updated 2 days ago
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-ink-soft">caption (12 / 16, weight 500)</span>
              <p className="text-[12px] leading-[16px] font-medium text-ink-soft">
                12 NOV 2026 · OPTIONAL NOTES · 15 CHARACTERS
              </p>
            </div>
          </div>
        </section>

        {/* Section: Badges & Chips */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Status badges, reply badges, & due chips
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Status is shown by text label, never color alone; chips have no icons. Shared 28px height with family-based fixed widths. Primary blue is used for time urgency.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-surface border border-rule flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-medium text-ink-soft">Application statuses (all 4)</h3>
              <div className="flex flex-wrap items-center gap-3">
                {STATUSES.map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-medium text-ink-soft">Reply types (all 6)</h3>
              <div className="flex flex-wrap items-center gap-3">
                {REPLY_TYPES.map((type) => (
                  <ReplyTypeBadge key={type} type={type} />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-medium text-ink-soft">Due chips (all 3 states)</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <DueChip deadline={overdueDate} />
                  <span className="text-[12px] text-ink-soft">Missed</span>
                </div>
                <div className="flex items-center gap-2">
                  <DueChip deadline={dueTodayDate} />
                  <span className="text-[12px] text-ink-soft">Today (Primary)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DueChip deadline={dueSoonDate} />
                  <span className="text-[12px] text-ink-soft">This week &le; 7 days (Primary)</span>
                </div>
                <div className="flex items-center gap-2">
                  <DueChip deadline={laterDate} />
                  <span className="text-[12px] text-ink-soft">Later &gt; 7 days</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Buttons */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Buttons
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              8px radius. Plain verbs saying what happens. Clear loading state preserving width.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-surface border border-rule flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-medium text-ink-soft">Variants (medium size)</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Save application</Button>
                <Button variant="secondary">Add reply</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="danger">Delete application</Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-medium text-ink-soft">Small size (sm)</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">Save application</Button>
                <Button variant="secondary" size="sm">Add reply</Button>
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button variant="danger" size="sm">Delete</Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-medium text-ink-soft">Actions</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Add application</Button>
                <Button variant="secondary">Save changes</Button>
                <Button variant="secondary">Open job link</Button>
                <Button variant="danger">Delete</Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-[14px] font-medium text-ink-soft">States: Loading & Disabled</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" loading>Save application</Button>
                <Button variant="secondary" loading>Add reply</Button>
                <Button variant="primary" disabled>Disabled primary</Button>
                <Button variant="secondary" disabled>Disabled secondary</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Form Controls */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Form controls
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Sunken well on rest, surface + ink outline on focus. Labels, hints, errors, and live counters.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-surface border border-rule grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field
              id="f-company"
              label="Company name"
              hint="Enter the hiring company or organization name."
              counter={{ current: companyName.length, max: 50 }}
              required
            >
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </Field>

            <Field
              id="f-role"
              label="Role"
              error="Role exceeds the maximum allowed length of 50 characters."
              counter={{ current: role.length, max: 50 }}
              required
            >
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Frontend Engineer"
              />
            </Field>

            <Field
              id="f-platform"
              label="Applied from"
              hint="Platform where you discovered and applied for this listing."
            >
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex flex-col gap-3">
              <label className="text-[14px] leading-[20px] font-medium text-ink select-none">
                Checkboxes
              </label>
              <div className="flex flex-col gap-2.5 pt-1">
                <Checkbox
                  checked={isChecked1}
                  onChange={setIsChecked1}
                  label="Mark as done (120ms check animation)"
                />
                <Checkbox
                  checked={isChecked2}
                  onChange={setIsChecked2}
                  label="Completed technical assessment"
                />
                <Checkbox
                  checked={false}
                  disabled
                  label="Disabled checkbox option"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Field
                id="f-notes"
                label="Notes"
                hint="Key contact info, interview notes, or follow-up schedule."
                counter={{ current: notes.length, max: 200 }}
              >
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* Section: Skeletons & Spinners */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Feedback indicators (Skeletons & Spinners)
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Sunken well tones with motion-respecting pulse.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-surface border border-rule flex flex-col gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-[12px] text-ink-soft">sm</span>
              </div>
              <div className="flex items-center gap-2">
                <Spinner size="md" />
                <span className="text-[12px] text-ink-soft">md</span>
              </div>
              <div className="flex items-center gap-2">
                <Spinner size="lg" />
                <span className="text-[12px] text-ink-soft">lg</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[14px] font-medium text-ink-soft">Skeleton card placeholder</span>
              <div className="p-4 rounded-[12px] bg-surface border border-rule flex flex-col gap-3 max-w-[480px]">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48" />
                <div className="flex items-center gap-2 pt-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Empty & Error States */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Empty & error states
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Inviting empty states and clear, unapologetic error states with action triggers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              title="No applications yet"
              description="Add the first one to start your log."
              action={
                <Button variant="primary" size="sm">
                  Add application
                </Button>
              }
            />

            <ErrorState
              title="Can't reach the server"
              message="Check your connection and try again."
              onRetry={() => toast.info("Retrying connection...")}
            />
          </div>
        </section>

        {/* Section: Dialogs & Overlays */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Dialogs & Toast Notifications
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Accessible focus trap, native Escape key handling, and token-styled notifications.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-surface border border-rule flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-[14px] font-medium text-ink-soft">Confirm dialog</h3>
              <div>
                <Button
                  variant="danger"
                  onClick={() => setIsDialogOpen(true)}
                >
                  Open delete confirmation dialog
                </Button>
              </div>

              <ConfirmDialog
                isOpen={isDialogOpen}
                title="Delete application"
                description="Are you sure you want to delete this job application? This action removes all logged replies and deadlines permanently."
                confirmLabel="Delete application"
                cancelLabel="Cancel"
                danger
                loading={isDialogLoading}
                onConfirm={handleConfirm}
                onCancel={() => setIsDialogOpen(false)}
              />
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t border-rule">
              <h3 className="text-[14px] font-medium text-ink-soft">Toast notifications</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast.success("Application saved")}
                >
                  Success toast
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toast.error("Can't reach the server. Check your connection and try again.")
                  }
                >
                  Error toast
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast.info("Reply marked as done")}
                >
                  Info toast
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Interaction states (Part 10) */}
        <section className="flex flex-col gap-4">
          <div className="border-b border-rule pb-2">
            <h2 className="text-[22px] leading-[28px] font-bold text-ink">
              Interaction states
            </h2>
            <p className="text-[14px] leading-[20px] text-ink-soft">
              Card hover lift, cursor spotlight, active scale-down, click ripple, and icon rotations.
            </p>
          </div>

          <div className="p-6 rounded-[12px] bg-surface border border-rule flex flex-col gap-8">
            {/* 1. All Button Variants */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[14px] font-medium text-ink-soft">
                Buttons by variant (hover lift, shadow fade, press scale, click ripple)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary button</Button>
                <Button variant="primary" loading>Primary loading</Button>
                <Button variant="primary" disabled>Primary disabled</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Button variant="secondary">Secondary button</Button>
                <Button variant="secondary" loading>Secondary loading</Button>
                <Button variant="secondary" disabled>Secondary disabled</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Button variant="ghost">Ghost button (no lift)</Button>
                <Button variant="ghost" loading>Ghost loading</Button>
                <Button variant="ghost" disabled>Ghost disabled</Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Button variant="danger">Danger button</Button>
                <Button variant="danger" loading>Danger loading</Button>
                <Button variant="danger" disabled>Danger disabled</Button>
              </div>
            </div>

            {/* 2. Button Sizes */}
            <div className="flex flex-col gap-3 pt-4 border-t border-rule">
              <h3 className="text-[14px] font-medium text-ink-soft">
                Button sizes (sm, md, lg)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small size (sm, 32px)</Button>
                <Button size="md">Medium size (md, 40px)</Button>
                <Button size="lg">Large size (lg, 48px)</Button>
              </div>
            </div>

            {/* 3. IconButton */}
            <div className="flex flex-col gap-3 pt-4 border-t border-rule">
              <h3 className="text-[14px] font-medium text-ink-soft">
                IconButton / Action Buttons
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <IconButton aria-label="Add item" variant="ghost">Add</IconButton>
                <IconButton aria-label="Delete item" variant="ghost">Del</IconButton>
                <IconButton aria-label="Save item" variant="secondary">Save</IconButton>
                <IconButton aria-label="Disabled button" disabled variant="ghost">Off</IconButton>
              </div>
            </div>

            {/* 4. SegmentedControl */}
            <div className="flex flex-col gap-3 pt-4 border-t border-rule">
              <h3 className="text-[14px] font-medium text-ink-soft">
                SegmentedControl (press feedback, click ripple)
              </h3>
              <div>
                <SegmentedControl
                  name="styleguide-segmented"
                  options={[
                    { value: "all", label: "All applications" },
                    { value: "in-process", label: "In process" },
                    { value: "archived", label: "Archived" },
                  ]}
                  value={segmentedVal}
                  onChange={setSegmentedVal}
                />
              </div>
            </div>

            {/* 5. Sample ApplicationCard with Spotlight */}
            <div className="flex flex-col gap-3 pt-4 border-t border-rule">
              <h3 className="text-[14px] font-medium text-ink-soft">
                ApplicationCard (hover lift -4px, shadow underlay fade, status edge 4px-&gt;6px, draw underline, and in-card cursor spotlight)
              </h3>
              <div ref={sampleCardGridRef} className="max-w-[420px]">
                <ApplicationCard application={sampleCardData} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
