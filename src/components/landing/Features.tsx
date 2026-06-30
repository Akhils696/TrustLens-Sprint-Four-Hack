"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, Percent, ShieldCheck, FileText, Zap, Share2 } from "lucide-react";

export function Features() {
  const featureList = [
    {
      title: "Explainable AI",
      description:
        "Know exactly why every redaction happened. Get plain-text explanations for every hidden or visible token.",
      icon: <Eye className="h-6 w-6 text-violet-500" />,
    },
    {
      title: "Confidence Scores",
      description:
        "Every classification is backed by a dynamic probability indicator score showing how confident the AI is.",
      icon: <Percent className="h-6 w-6 text-indigo-500" />,
    },
    {
      title: "Human Verification",
      description:
        "Absolute control. Approve, reject, or edit any redaction within a clean side-by-side interactive dashboard.",
      icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
    },
    {
      title: "Privacy Reports",
      description:
        "Export downloadable, cryptographically signed audit logs proving that data is compliant and fully anonymized.",
      icon: <FileText className="h-6 w-6 text-sky-500" />,
    },
    {
      title: "Safe Sharing",
      description:
        "Send your scrubbed documents to external models like ChatGPT or Claude with zero risk of leak liability.",
      icon: <Share2 className="h-6 w-6 text-amber-500" />,
    },
    {
      title: "Fast Processing",
      description:
        "Zero lag. Upload, parse, and verify documents of up to 15MB in under a few seconds.",
      icon: <Zap className="h-6 w-6 text-rose-500" />,
    },
  ];

  return (
    <section id="features" className="py-20 bg-secondary/30 border-y border-border">
      <div className="container space-y-12 text-center">
        <div className="space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            Built for Transparent Document Safety
          </h2>
          <p className="text-muted-foreground">
            TrustLens gives compliance teams, lawyers, and risk analysts the tools to leverage
            generative AI safely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureList.map((feat) => (
            <Card key={feat.title} hoverable className="text-left bg-card">
              <CardHeader className="space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                  {feat.icon}
                </div>
                <CardTitle className="text-xl">{feat.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                  {feat.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
