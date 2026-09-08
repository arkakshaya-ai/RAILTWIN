// In-app placeholder: no README.md existed in the repo at build time, so the
// header's "Documentation" nav item routes here instead of a would-be dead
// external link. Swap this out once repo docs exist to link to.
export function DocumentationPage() {
  return (
    <div className="max-w-[1480px] mx-auto px-gutter-desktop py-space-3xl min-h-[60vh] flex flex-col items-center justify-center text-center gap-space-sm">
      <span className="material-symbols-outlined text-primary text-[40px]">menu_book</span>
      <h1 className="font-headline-xl text-headline-xl text-on-surface">Documentation</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
        Platform documentation is being assembled alongside the rest of the RailTwin build. Check back soon.
      </p>
    </div>
  );
}
