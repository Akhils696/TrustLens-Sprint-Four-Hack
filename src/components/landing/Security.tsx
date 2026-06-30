"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, EyeOff, Key, Database } from "lucide-react";

export function Security() {
  const securityFeatures = [
    {
      title: "Local-First Philosophy",
      description:
        "Document parsing and layout analysis can be run locally inside your browser sandbox.",
      icon: <Database className="h-5 w-5 text-emerald-500" />,
    },
    {
      title: "Encrypted processing",
      description:
        "All client-server traffic is wrapped in TLS 1.3, and cached files are protected with AES-256.",
      icon: <Key className="h-5 w-5 text-indigo-500" />,
    },
    {
      title: "Zero Retention",
      description:
        "Uploaded document text slices are wiped from our memory servers immediately after verification.",
      icon: <EyeOff className="h-5 w-5 text-violet-500" />,
    },
    {
      title: "Transparent Decisions",
      description:
        "Get full audit trails showing explanation records for every redacted and unmasked token.",
      icon: <Lock className="h-5 w-5 text-rose-500" />,
    },
  ];

  return (
    <section id="security" className="py-20 bg-secondary/20 border-t border-border">
      <div className="container space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 select-none">
              <span>GDPR & HIPAA Compliant</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
              Enterprise-Grade Privacy Guarantees
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We design software around one central concept: you shouldn&apos;t have to trust us.
              Our architecture verifies privacy boundaries at the token level, ensuring your
              intellectual property is locked down before it reaches external large language models.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {securityFeatures.map((item) => (
              <Card key={item.title} className="bg-card">
                <CardHeader className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    {item.icon}
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
