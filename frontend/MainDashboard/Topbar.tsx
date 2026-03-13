import type { SectionType } from "./types";

type Props = {
  activeSection: SectionType;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

function formatKoreanDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

const sectionTitleMap: Record<SectionType, string> = {
  overview: "종합 상황판",
  reputation: "Reputation Monitor",
  customer: "Customer Health",
  opportunity: "Opportunity Pipeline",
};

export default function Topbar({
  activeSection,
  sidebarOpen,
  setSidebarOpen,
}: Props) {
  const todayText = formatKoreanDate(new Date());

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="사이드바 토글"
        >
          <i className="fas fa-bars"></i>
        </button>

        <div className="topbar-breadcrumb">
          <span className="topbar-breadcrumb-root">신일팜글래스</span>
          <span className="topbar-breadcrumb-divider">/</span>
          <span className="topbar-breadcrumb-current">
            {sectionTitleMap[activeSection]}
          </span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="status-indicator">
          <span className="status-dot pulse"></span>
          <span>실시간 모니터링</span>
        </div>

        <div className="date-badge">
          <i className="far fa-calendar-alt"></i>
          <span>{todayText}</span>
        </div>
      </div>
    </header>
  );
}