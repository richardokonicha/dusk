import { motion } from "framer-motion";
import { Sparkles, Zap, Shield, Keyboard, Command } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-lg text-center"
      >
        <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>

        <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Version 0.1.0</span>
          <span>·</span>
          <span>Beta</span>
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-foreground">
          Welcome to Dusk
        </h1>

        <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
          Your calm, focused work environment. Connect your AI providers and start building with clarity.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          Get Started
          <Zap className="h-4 w-4" />
        </motion.button>

        <div className="mt-16 grid grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Secure</span>
            <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Fast</span>
            <span className="text-xs text-muted-foreground">Optimized performance</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Keyboard className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Elegant</span>
            <span className="text-xs text-muted-foreground">Keyboard-first UX</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            Press <kbd className="ml-1 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs">?</kbd> for shortcuts
          </span>
        </div>
      </motion.div>
    </div>
  );
}
