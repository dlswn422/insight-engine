import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <div className="main-content" id="mainContent">
        <Topbar />
        {children}
      </div>
    </>
  );
}