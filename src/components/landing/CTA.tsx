"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

export function CTA() {
  const router = useRouter();

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

      <div className="container relative z-10 max-w-4xl mx-auto text-center space-y-8 border border-border bg-card p-12 rounded-2xl shadow-xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary mb-2">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Ready to Verify Your Document Safety?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Stop guessing if your automated anonymizers missed a customer ID. Use TrustLens to
            verify privacy boundaries transparently before sending anything to generative AI tools.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            className="shadow-md cursor-pointer"
            onClick={() => router.push("/sandbox")}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Upload Document
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="cursor-pointer"
            onClick={() => router.push("/sandbox")}
          >
            Explore Sandbox
          </Button>
        </div>
      </div>
    </section>
  );
}
