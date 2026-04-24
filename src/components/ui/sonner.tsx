import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertTriangle, Info, XCircle, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      expand
      visibleToasts={6}
      gap={10}
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        error: <XCircle className="h-4 w-4 text-destructive" />,
        warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        info: <Info className="h-4 w-4 text-sky-500" />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          title: "text-sm font-medium",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          success:
            "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/5",
          error:
            "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/5",
          warning:
            "group-[.toaster]:border-amber-500/30 group-[.toaster]:bg-amber-500/5",
          info: "group-[.toaster]:border-sky-500/30 group-[.toaster]:bg-sky-500/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
</content>
</invoke>