export function PageHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl">{title}</h1>
        <p className="mt-1 font-serif text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}
