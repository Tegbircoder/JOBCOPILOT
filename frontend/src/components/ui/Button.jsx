export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}) {
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-3",
    lg: "px-6 py-3 text-lg",
  };
  const variants = {
    primary: "bg-accent text-white hover:bg-accentDark",
    outline:
      "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
    subtle: "bg-slate-100 text-slate-900 hover:bg-slate-200",
  };
  return (
    <button
      {...props}
      className={`rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
