export function RouteBadge({ number, color, small = false }: { number: string; color: string; small?: boolean }) {
  return <span className={small ? 'mini-badge' : 'route-badge'} style={{ backgroundColor: color }}>{number}</span>;
}
