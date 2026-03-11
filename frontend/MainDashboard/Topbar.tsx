function formatKoreanDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

export default function Topbar() {

  const todayText = formatKoreanDate(new Date());

  return (
    <div className="topbar">
      <button className="sidebar-toggle">
        <i className="fas fa-bars"></i>
      </button>

      <div className="topbar-title" id="topbarTitle">
        종합 상황판
      </div>

      <div className="topbar-right">
        <div className="status-indicator">
          <span className="status-dot pulse"></span>
          <span>실시간 모니터링 중</span>
        </div>

        <div className="date-badge">
          <i className="far fa-calendar-alt"></i>
          <span>{todayText}</span>
        </div>
      </div>
    </div>
  );
}