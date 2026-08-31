import { ChecklistLinkDialog } from "@/components/checklist-link-dialog";
import {
  advanceChecklistStep,
  completeChecklistStep,
  revokeChecklistLink,
  setChecklistCurrentStep,
  uploadChecklistPhotos,
} from "@/app/bookings/checklist-actions";
import { checklistPhotoConstraints } from "@/lib/upload-storage";
import { checklistSteps, type ChecklistFlow } from "@/lib/checklist-definitions";

type ChecklistRecord = {
  flow: string;
  status: string;
  currentStep: number;
  completedAt: Date | null;
  completedByUser?: { email: string } | null;
  steps: {
    id: string;
    stepKey: string;
    displayOrder: number;
    status: string;
    damageReport: string | null;
    completedAt: Date | null;
    photos: { id: string; fileReference: string }[];
  }[];
};

function HiddenFlow({ bookingId, flow }: Readonly<{ bookingId: string; flow: ChecklistFlow }>) {
  return (
    <>
      <input name="bookingId" type="hidden" value={bookingId} />
      <input name="flow" type="hidden" value={flow} />
    </>
  );
}

function FlowChecklist({
  bookingId,
  flow,
  checklist,
  hasActiveLink,
  showLinkControls = true,
}: Readonly<{
  bookingId: string;
  flow: ChecklistFlow;
  checklist?: ChecklistRecord;
  hasActiveLink: boolean;
  showLinkControls?: boolean;
}>) {
  const definitions = checklistSteps[flow];
  const complete = checklist?.status === "COMPLETED";
  const currentIndex = Math.min(checklist?.currentStep ?? 0, definitions.length - 1);
  const completedCount = checklist?.steps.filter((step) => step.status === "COMPLETED").length ?? 0;
  const currentDefinition = definitions[currentIndex];
  const current = checklist?.steps.find((step) => step.stepKey === currentDefinition.key);
  const stepState = (key: string) =>
    checklist?.steps.find((step) => step.stepKey === key)?.status ?? "INCOMPLETE";
  const heading = flow === "DROPOFF" ? "Dropoff" : "Pickup";
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{heading} checklist</h3>
          <p className="mt-1 text-sm text-slate-600">
            {completedCount} of {definitions.length} steps complete
          </p>
        </div>
        {complete ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            ✓ Completed
          </span>
        ) : (
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
            {checklist?.status === "IN_PROGRESS" ? "In progress" : "Not started"}
          </span>
        )}
      </div>
      {complete ? (
        <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Completed{checklist?.completedByUser ? ` by ${checklist.completedByUser.email}` : ""}
          {checklist?.completedAt ? ` on ${checklist.completedAt.toLocaleString()}` : ""}. This
          checklist is read-only.
        </p>
      ) : (
        <>
          <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Current step {currentIndex + 1} of {definitions.length}
            </p>
            <h4 className="mt-1 text-base font-semibold text-slate-900">
              {currentDefinition.label}
            </h4>
            {currentDefinition.kind === "contract" && (
              <p className="mt-1 text-sm text-slate-600">
                A signed contract is required before this step can be completed.
              </p>
            )}
            {currentDefinition.kind === "manual" && (
              <p className="mt-1 text-sm text-slate-600">Confirm this manually for now.</p>
            )}
            {currentDefinition.kind === "photos" && (
              <p className="mt-1 text-sm text-slate-600">
                Upload at least one photo, then mark this step complete.
              </p>
            )}
            {currentDefinition.kind === "damage" && (
              <p className="mt-1 text-sm text-slate-600">Add notes and any supporting photos.</p>
            )}
            {currentDefinition.kind === "photos" || currentDefinition.kind === "damage" ? (
              <form
                action={uploadChecklistPhotos}
                className="mt-4 flex flex-wrap items-end gap-2"
                encType="multipart/form-data"
              >
                <HiddenFlow bookingId={bookingId} flow={flow} />
                <input name="stepKey" type="hidden" value={currentDefinition.key} />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Photos
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="text-sm font-normal"
                    multiple
                    name="photos"
                    type="file"
                  />
                </label>
                <button className="secondary-button" type="submit">
                  Upload photos
                </button>
                <span className="text-xs text-slate-500">{checklistPhotoConstraints}</span>
              </form>
            ) : null}
            {current && current.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                <span>
                  {current.photos.length} photo{current.photos.length === 1 ? "" : "s"} uploaded.
                </span>
                {current.photos.map((photo, index) => (
                  <a
                    className="text-action"
                    href={`/api/checklist-images/${photo.fileReference}`}
                    key={photo.id}
                    target="_blank"
                  >
                    View photo {index + 1}
                  </a>
                ))}
              </div>
            )}
            <form action={completeChecklistStep} className="mt-4 grid gap-3">
              <HiddenFlow bookingId={bookingId} flow={flow} />
              <input name="stepKey" type="hidden" value={currentDefinition.key} />
              {currentDefinition.kind === "damage" && (
                <textarea
                  className="min-h-24 rounded-lg border border-slate-200 p-3 text-sm"
                  defaultValue={current?.damageReport ?? ""}
                  maxLength={5000}
                  name="damageReport"
                  placeholder="Describe any damage, or enter no damage found."
                />
              )}
              {currentDefinition.kind === "manual" && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input name="manualConfirmed" type="checkbox" /> I confirm this step is complete.
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <button className="primary-button" type="submit">
                  {currentDefinition.kind === "confirm"
                    ? "Confirm and complete checklist"
                    : "Mark step complete"}
                </button>
                <button
                  className="secondary-button"
                  formAction={advanceChecklistStep}
                  type="submit"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-800">All steps</p>
            <ol className="mt-2 grid gap-2">
              {definitions.map((step, index) => {
                const status = stepState(step.key);
                return (
                  <li key={step.key}>
                    <form action={setChecklistCurrentStep}>
                      <HiddenFlow bookingId={bookingId} flow={flow} />
                      <input name="step" type="hidden" value={index} />
                      <button
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${index === currentIndex ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                        type="submit"
                      >
                        <span>
                          {index + 1}. {step.label}
                        </span>
                        <span
                          className={
                            status === "COMPLETED"
                              ? "text-emerald-700"
                              : index === currentIndex
                                ? "text-blue-700"
                                : "text-slate-500"
                          }
                        >
                          {status === "COMPLETED"
                            ? "✓ Complete"
                            : index === currentIndex
                              ? "In progress"
                              : "Incomplete"}
                        </span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ol>
          </div>
          {showLinkControls && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <ChecklistLinkDialog
                bookingId={bookingId}
                flow={flow}
                hasActiveLink={hasActiveLink}
              />
              {hasActiveLink && (
                <form action={revokeChecklistLink}>
                  <HiddenFlow bookingId={bookingId} flow={flow} />
                  <button className="text-action text-red-700" type="submit">
                    Revoke active link
                  </button>
                </form>
              )}
              {hasActiveLink && (
                <span className="text-xs text-slate-500">
                  An active link exists. Generate a replacement link to copy a fresh URL.
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function BookingChecklists({
  bookingId,
  checklists,
  activeFlows,
  flows = ["DROPOFF", "PICKUP"],
  showLinkControls = true,
}: Readonly<{
  bookingId: string;
  checklists: ChecklistRecord[];
  activeFlows: string[];
  flows?: ChecklistFlow[];
  showLinkControls?: boolean;
}>) {
  return (
    <section className="section-card mt-6">
      <div>
        <h2 className="text-base font-semibold text-slate-800">Pickup & dropoff</h2>
        <p className="mt-1 text-sm text-slate-600">
          Complete each handoff step in order, or jump to any step when needed.
        </p>
      </div>
      <div className={`mt-5 grid gap-5 ${flows.length > 1 ? "xl:grid-cols-2" : "max-w-2xl"}`}>
        {flows.map((flow) => (
          <FlowChecklist
            bookingId={bookingId}
            checklist={checklists.find((checklist) => checklist.flow === flow)}
            flow={flow}
            hasActiveLink={activeFlows.includes(flow)}
            key={flow}
            showLinkControls={showLinkControls}
          />
        ))}
      </div>
    </section>
  );
}
