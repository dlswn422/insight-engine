import DashboardLayout from "../MainDashboard/DashboardLayout";
import OverviewSection from "../MainDashboard/01_overview/OverviewSection";
import ReputationSection from "../MainDashboard/02_Reputation/ReputationSection";
import CustomerHealthSection from "../MainDashboard/03_CustomerHealth/CustomerHealthSection";
import OpportunitySection from "../MainDashboard/04_Opportunity/OpportunitySection";
export default function Page() {
  return (
    <DashboardLayout>
      <OverviewSection />
    </DashboardLayout>
  );
}