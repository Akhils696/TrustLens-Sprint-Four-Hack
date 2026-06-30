"use client";

import * as React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Security } from "@/components/landing/Security";
import { CTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <MainLayout>
      <div className="flex flex-col w-full">
        <Hero />
        <Features />
        <HowItWorks />
        <Security />
        <CTA />
      </div>
    </MainLayout>
  );
}
