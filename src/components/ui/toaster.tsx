import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import ErrorPopup from "@/components/system/ErrorPopup";
import type { PublicErrorKind } from "@/lib/publicError";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const errorToast = toasts.find((t) => t.variant === "destructive" && t.open !== false);
  const otherToasts = toasts.filter((t) => t.variant !== "destructive");

  return (
    <>
      {errorToast ? (
        <ErrorPopup
          kind={(errorToast.errorKind as PublicErrorKind | undefined) ?? "unknown"}
          title={errorToast.title}
          hint={errorToast.description}
          onClose={() => dismiss(errorToast.id)}
        />
      ) : null}
      <ToastProvider>
        {otherToasts.map(function ({ id, title, description, action, ...props }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose />
            </Toast>
          );
        })}
        <ToastViewport />
      </ToastProvider>
    </>
  );
}
