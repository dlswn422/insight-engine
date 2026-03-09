export default function FilterBar() {
  return (
    <div className="filter-bar">
      <div className="search-box">
        <i className="fas fa-search"></i>
        <input
          type="text"
          id="customerSearch"
          placeholder="고객사 검색..."
        />
      </div>

      <div className="filter-btns">
        <button className="filter-btn active" data-filter="all">
          전체 <span className="filter-count" id="cnt-all">47</span>
        </button>
        <button className="filter-btn red" data-filter="red">
          🔴 위험 <span className="filter-count" id="cnt-red">3</span>
        </button>
        <button className="filter-btn yellow" data-filter="yellow">
          🟡 주의 <span className="filter-count" id="cnt-yellow">5</span>
        </button>
        <button className="filter-btn green" data-filter="green">
          🟢 건강 <span className="filter-count" id="cnt-green">39</span>
        </button>
      </div>

      <div className="sort-select">
        <select>
          <option value="risk">위험도 순</option>
          <option value="name">이름 순</option>
          <option value="score">건강도 점수 순</option>
          <option value="revenue">매출 기여 순</option>
        </select>
      </div>
    </div>
  );
}