import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetBackendCircuit } from "@/lib/backendHealth";
import { useBackendHealth } from "@/hooks/useBackendHealth";

const BackendHealthBanner = () => {
  const queryClient = useQueryClient();
  const health = useBackendHealth();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (health.status === "up") return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [health.status]);

  const retryInMs = useMemo(() => {
    if (!health.nextRetryAt) return 0;
    return Math.max(0, health.nextRetryAt - now);
  }, [health.nextRetryAt, now]);

  const retryInSeconds = Math.max(1, Math.ceil(retryInMs / 1000));

  if (health.status === "up") return null;

  return (
    <aside className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <div className="leading-tight">
            <p className="text-foreground">
              <span className="font-medium text-destructive">Service issue:</span>{" "}
              Temporarily unavailable.
              {health.nextRetryAt ? (
                <span className="text-muted-foreground"> Retrying in {retryInSeconds}s.</span>
              ) : null}
            </p>
            {health.lastErrorMessage ? (
              <p className="text-xs text-muted-foreground">Last error: {health.lastErrorMessage}</p>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              resetBackendCircuit();
              queryClient.invalidateQueries();
            }}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Retry now
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default BackendHealthBanner;
