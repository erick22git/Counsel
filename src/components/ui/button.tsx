import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Un solo botón primario por pantalla. Todos miden ≥ 44 px de alto. */
export const buttonVariants = cva(
  "press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-btn)] font-medium select-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:opacity-90",
        secondary: "bg-accent-soft text-accent hover:opacity-80",
        outline: "border border-line-strong bg-surface text-ink hover:bg-surface-2",
        ghost: "text-ink hover:bg-surface-2",
        danger: "border border-danger text-danger bg-surface hover:bg-danger-soft",
        pill: "rounded-full bg-ink text-canvas hover:opacity-85 uppercase tracking-wide text-[0.8rem]",
      },
      size: {
        md: "min-h-12 px-5 text-[1rem]",
        sm: "min-h-11 px-4 text-[0.95rem]",
        lg: "min-h-14 px-7 text-[1.05rem]",
        icon: "min-h-11 min-w-11 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...(asChild ? {} : { type: type ?? "button" })}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
