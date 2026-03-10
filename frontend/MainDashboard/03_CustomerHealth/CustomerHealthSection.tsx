"use client";

import { useMemo, useState } from "react";

import FilterBar from "./FilterBar";
import CustomerTable from "./CustomerTable";
import RiskChartsRow from "./RiskChartsRow";

import { customerList } from "../mockData/customerData";

type StatusFilter = "all" | "red" | "yellow" | "green";
type SortType = "risk" | "name" | "score" | "revenue";

export default function CustomerHealthSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortType>("risk");

  const filteredCustomers = useMemo(() => {
    let list = [...customerList];

    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }

    if (search.trim()) {
      const keyword = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(keyword) ||
          c.type.toLowerCase().includes(keyword)
      );
    }

    if (sortBy === "risk") {
      list.sort((a, b) => b.riskPct - a.riskPct);
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "score") {
      list.sort((a, b) => a.healthScore - b.healthScore);
    } else if (sortBy === "revenue") {
      list.sort((a, b) => parseInt(b.revenue) - parseInt(a.revenue));
    }

    return list;
  }, [search, statusFilter, sortBy]);

  return (
    <section className="section active" id="section-customer">
      <div className="section-header">
        <h1>
          <i className="fas fa-users"></i> Customer Health Dashboard
        </h1>
        <p>주요 고객사 건강도 실시간 모니터링</p>
      </div>

      <FilterBar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
        <div className="sort-select">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
          >
            <option value="risk">위험도 순</option>
            <option value="name">이름 순</option>
            <option value="score">건강도 점수 순</option>
            <option value="revenue">매출 기여 순</option>
          </select>
        </div>
      </div>

      <CustomerTable customers={filteredCustomers} />
      <RiskChartsRow customers={filteredCustomers} />
    </section>
  );
}