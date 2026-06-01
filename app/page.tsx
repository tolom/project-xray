import type { Metadata } from "next";

import { ProjectXRayHome } from "@/components/ProjectXRayHome";

export const metadata: Metadata = {
  title: "Project X-Ray | AI Product Fragility Checks",
  description:
    "Automated fragility checks for AI-built products before launch. Client-side analysis through the GitHub API.",
  openGraph: {
    title: "Project X-Ray | AI Product Fragility Checks",
    description:
      "Scan a GitHub repository for structural risks before launch. No repository code storage.",
    type: "website",
  },
};

export default function LandingPage() {
  return <ProjectXRayHome />;
}
