"use client";

import { useState } from "react";
import DashboardLayout from "@/MainDashboard/DashboardLayout";
import OverviewSection from "@/MainDashboard/01_overview/OverviewSection";
import ReputationSection from "@/MainDashboard/02_Reputation/ReputationSection";
import CustomerHealthSection from "@/MainDashboard/03_CustomerHealth/CustomerHealthSection";
import OpportunitySection from "@/MainDashboard/04_Opportunity/OpportunitySection";
import type { SectionType } from "@/MainDashboard/types";

export default function Page() {
  const [activeSection, setActiveSection] =
    useState<SectionType>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <DashboardLayout
      activeSection={activeSection}
      setActiveSection={setActiveSection}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      {activeSection === "overview" && (
        <OverviewSection setActiveSection={setActiveSection} />
      )}
      {activeSection === "reputation" && <ReputationSection />}
      {activeSection === "customer" && <CustomerHealthSection />}
      {activeSection === "opportunity" && <OpportunitySection />}
    </DashboardLayout>
  );
}