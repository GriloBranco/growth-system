interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = "bg-zinc-100 text-zinc-700" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
