"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, ShieldCheck, FileSpreadsheet } from "lucide-react";

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden py-20 lg:py-32 bg-background">
      {/* Background Gradient Blurs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] md:h-[600px] md:w-[600px] rounded-full bg-primary/10 blur-[80px] dark:bg-primary/5" />
        <div className="absolute top-1/3 left-1/3 -translate-y-1/2 h-[250px] w-[250px] md:h-[400px] md:w-[400px] rounded-full bg-violet-500/10 blur-[60px] dark:bg-violet-500/5" />
      </div>

      <div className="container relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Text Area */}
        <div className="lg:col-span-7 text-left space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-foreground select-none"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sprint 1 Beta Live</span>
          </motion.div>

          <div className="space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] md:leading-[1.05]"
            >
              Privacy you can{" "}
              <span className="bg-gradient-to-r from-primary via-violet-500 to-indigo-500 bg-clip-text text-transparent">
                verify.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-xl text-muted-foreground font-normal leading-relaxed max-w-xl"
            >
              TrustLens helps users confidently share documents by making every AI redaction
              transparent and explainable before sending documents to AI tools.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Button
              size="lg"
              className="shadow-lg cursor-pointer"
              onClick={() => router.push("/sandbox")}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Upload Document
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="cursor-pointer"
              onClick={() => {
                const el = document.getElementById("features");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Learn More
            </Button>
          </motion.div>
        </div>

        {/* Visual / Floating Cards Area */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          {/* Main Document Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="w-full max-w-[380px] rounded-2xl border border-border bg-card shadow-2xl p-6 relative overflow-hidden backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <span className="text-sm font-bold text-foreground">Operational_Audit.docx</span>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground/80">
              <p>
                This compliance memo certifies that the customer details matching{" "}
                <span className="bg-primary/20 text-foreground px-1.5 py-0.5 rounded font-mono font-semibold">
                  [REDACTED_NAME_1]
                </span>{" "}
                were stored within our cloud instance.
              </p>
              <p>
                The billing ledger reports a total quantity of{" "}
                <span className="border border-border text-foreground px-1.5 py-0.5 rounded font-semibold bg-secondary/40">
                  $4,250.00 USD
                </span>{" "}
                transacted on June 28, 2026.
              </p>
            </div>
          </motion.div>

          {/* Floating Explanation Overlay */}
          <motion.div
            initial={{ x: 20, y: 40, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35, type: "spring" }}
            className="absolute -top-12 right-0 md:-right-8 rounded-xl border border-border bg-card p-4 shadow-xl max-w-[220px] animate-float backdrop-blur-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-bold text-foreground">Explainability Log</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Flagged as Name: matched customer signature block context in header.
            </p>
          </motion.div>

          {/* Floating Confidence Badge */}
          <motion.div
            initial={{ x: -30, y: 100, opacity: 0 }}
            animate={{ x: 0, y: 80, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45, type: "spring" }}
            className="absolute bottom-4 left-0 md:-left-8 rounded-xl border border-border bg-card p-3 shadow-lg flex items-center gap-3 backdrop-blur-md"
          >
            <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground font-semibold">
                CONFIDENCE SCORE
              </div>
              <div className="text-sm font-bold text-foreground">98% Match</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
