"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Upload, Cpu, Eye, ShieldCheck, Share2 } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      title: "Upload",
      description: "Drop your PDF, DOCX, or TXT file into our secure workspace.",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      title: "AI Detection",
      description: "Presidio NER models scan and flag candidate PII details ephemerally.",
      icon: <Cpu className="h-5 w-5" />,
    },
    {
      title: "Review",
      description: "Examine explanations showing why text is redacted or visible.",
      icon: <Eye className="h-5 w-5" />,
    },
    {
      title: "Verify",
      description: "Approve or reject classifications and view the Document Safety Score.",
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      title: "Safe To Share",
      description: "Export clean files and cryptographic compliance reports.",
      icon: <Share2 className="h-5 w-5" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background overflow-hidden">
      <div className="container space-y-16 text-center">
        <div className="space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Clear Audits In Minutes
          </h2>
          <p className="text-muted-foreground">
            How TrustLens proves your document is safe to share with external AI applications.
          </p>
        </div>

        {/* Timeline Desktop Grid / Mobile Stack */}
        <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-8 items-start max-w-5xl mx-auto">
          {/* Connecting Line (Desktop) */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-border -translate-y-1/2 hidden lg:block z-0" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="relative z-10 flex flex-col items-center text-center space-y-4 bg-background px-4"
            >
              {/* Step Circle */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-card text-foreground font-bold shadow-md">
                {step.icon}
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                  Step {idx + 1}
                </span>
                <h4 className="text-lg font-bold text-foreground">{step.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
