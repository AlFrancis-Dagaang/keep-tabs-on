// A row's Edit and Remove buttons, in its actions cell. On phones the cell is the card's bottom row.
export function RowActions({ items }: { items: { label: string; node: React.ReactNode }[] }) {
  return items.filter((item) => item.node).map((item) => <span key={item.label} className="contents">{item.node}</span>);
}
