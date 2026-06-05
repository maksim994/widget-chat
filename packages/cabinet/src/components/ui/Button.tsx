import type { ReactNode, ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "primary" | "outline";
};

export default function Button({
  children,
  size = "md",
  variant = "primary",
  className = "",
  disabled,
  ...rest
}: Props) {
  const sizeClasses = { sm: "px-4 py-2.5 text-sm", md: "px-5 py-3.5 text-sm" };
  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700",
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
