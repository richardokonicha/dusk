import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, SkipForward, ArrowLeft, Check } from "lucide-react";
import { WelcomeScreen } from "./WelcomeScreen";
import { ProviderSetup } from "./ProviderSetup";
import { WorkspaceSetup } from "./WorkspaceSetup";
import type { OnboardingStep } from "@shared/types";

const steps: { key: OnboardingStep; label: string; description: string }[] = [
  { key: "welcome", label: "Welcome", description: "Get started" },
  { key: "provider", label: "Provider", description: "Connect AI" },
  { key: "workspace", label: "Workspace", description: "Organize" },
  { key: "complete", label: "Complete", description: "You are all set" }
];

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  const nextStep = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
    }
  };

  const prevStep = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
    }
  };

  const handleComplete = async () => {
    onComplete();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Dusk Setup</span>
          <span className="text-xs text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </span>
        </div>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip setup
          <SkipForward className="h-4 w-4" />
        </button>
      </header>

      <div className="flex items-center justify-center px-6 py-6">
        <div className="flex items-center gap-1">
          {steps.map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = index < currentIndex;
            return (
              <div key={step.key} className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {isCompleted && index < currentIndex ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-xs ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 rounded-full transition-colors ${
                      index < currentIndex ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <main className="relative flex-1 overflow-auto px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-2xl"
          >
            {currentStep === "welcome" && (
              <WelcomeScreen onGetStarted={nextStep} />
            )}
            {currentStep === "provider" && (
              <ProviderSetup onNext={nextStep} onBack={prevStep} />
            )}
            {currentStep === "workspace" && (
              <WorkspaceSetup onNext={nextStep} onBack={prevStep} />
            )}
            {currentStep === "complete" && (
              <CompleteStep onComplete={handleComplete} />
            )}
          </motion.div>
        </AnimatePresence>

        {currentStep !== "welcome" && currentStep !== "complete" && (
          <div className="mx-auto mt-8 flex max-w-2xl items-center justify-between">
            <button
              onClick={prevStep}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              {currentStep === "provider" && (
                <button
                  onClick={onSkip}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Skip
                </button>
              )}
              {currentStep === "workspace" && (
                <button
                  onClick={onSkip}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
      >
        <CheckIcon className="h-8 w-8 text-primary" />
      </motion.div>
      <h2 className="mb-2 text-2xl font-bold text-foreground">You are all set</h2>
      <p className="mb-8 max-w-sm text-muted-foreground">
        Dusk is ready to help you stay focused and productive.
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        Open Dashboard
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
