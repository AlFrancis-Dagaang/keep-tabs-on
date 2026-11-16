export function PageHeader({ title, description, icon, children }: { title: string; description: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-3 font-serif text-3xl">{icon}{title}</h1>
        <p className="mt-1 font-serif text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}
