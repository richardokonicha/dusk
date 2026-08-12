import { useState } from "react";
import { motion } from "framer-motion";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import type { Provider } from "@shared/types";

interface ProviderTestProps {
  provider: Provider;
  onTestComplete?: (result: { success: boolean; models?: string[]; error?: string }) => void;
}

export function ProviderTest({ provider, onTestComplete }: ProviderTestProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; models?: string[]; error?: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const testResult = await window.dusk.onboarding.testProviderConnection({
        type: provider.type,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey
      });
      const mapped = {
        success: testResult.success,
        models: testResult.data?.models,
        error: testResult.data?.error,
      };
      setResult(mapped);
      onTestComplete?.(mapped);
    } catch {
      const errorResult = { success: false as const, error: "Connection failed" };
      setResult(errorResult);
      onTestComplete?.(errorResult);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Connection Test</h4>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </motion.button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border p-3 text-sm ${
            result.success
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <div className="font-medium">
                {result.success ? "Connection successful" : "Connection failed"}
              </div>
              {result.success && result.models && result.models.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Available models ({result.models.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.models.slice(0, 6).map((model) => (
                      <span
                        key={model}
                        className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-300"
                      >
                        {model}
                      </span>
                    ))}
                    {result.models.length > 6 && (
                      <span className="rounded-md bg-green-500/10 px-2 py-0.5 text-xs text-green-300">
                        +{result.models.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              {!result.success && (
                <div className="mt-1 text-xs opacity-80">{result.error}</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {!result && !testing && (
        <p className="text-sm text-muted-foreground">
          Click "Test Connection" to verify your provider is working correctly.
        </p>
      )}
    </div>
  );
}
