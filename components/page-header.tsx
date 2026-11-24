export function PageHeader({ title, description, icon, hideOnPhone, children }: { title: string; description: string; icon?: React.ReactNode; hideOnPhone?: boolean; children?: React.ReactNode }) {
  // hideOnPhone: a HeroBlock carries the title below 768px; the header stays there only for its button.
  return (
    <header className={`mb-6 flex flex-wrap items-end justify-between gap-4 ${hideOnPhone ? (children ? "max-md:mb-4" : "max-md:hidden") : ""}`}>
      <div className={hideOnPhone ? "max-md:hidden" : undefined}>
        <h1 className="flex items-center gap-3 font-serif text-3xl">{icon}{title}</h1>
        <p className="mt-1 font-serif text-muted-foreground">{description}</p>
      </div>
      {children && <div className="max-md:w-full max-md:[&>button]:min-h-11 max-md:[&>button]:w-full">{children}</div>}
    </header>
  );
}
