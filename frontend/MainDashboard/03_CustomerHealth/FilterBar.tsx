import { customerList } from "../mockData/customerData";

type StatusFilter = "all" | "red" | "yellow" | "green";

interface FilterBarProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
}

export default function FilterBar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
}: FilterBarProps) {
  const total = customerList.length;
  const red = customerList.filter((c) => c.status === "red").length;
  const yellow = customerList.filter((c) => c.status === "yellow").length;
  const green = customerList.filter((c) => c.status === "green").length;

  return (
    <div className="filter-bar">
      <div className="search-box">
        <i className="fas fa-search"></i>
        <input
          id="customerSearch"
          type="text"
          placeholder="고객사 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-btns">
        <button
          type="button"
          className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          전체 <span className="filter-count">{total}</span>
        </button>

        <button
          type="button"
          className={`filter-btn red ${statusFilter === "red" ? "active" : ""}`}
          onClick={() => setStatusFilter("red")}
        >
          🔴 위험 <span className="filter-count">{red}</span>
        </button>

        <button
          type="button"
          className={`filter-btn yellow ${
            statusFilter === "yellow" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("yellow")}
        >
          🟡 주의 <span className="filter-count">{yellow}</span>
        </button>

        <button
          type="button"
          className={`filter-btn green ${
            statusFilter === "green" ? "active" : ""
          }`}
          onClick={() => setStatusFilter("green")}
        >
          🟢 건강 <span className="filter-count">{green}</span>
        </button>
      </div>
    </div>
  );
}