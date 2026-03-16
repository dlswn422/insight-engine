"use client";

import { useState } from "react";
import { reputationWordCloud } from "../mockData/reputationData";

type WordCloudTab = "positive" | "negative" | "all";

export default function WordCloudPanel() {
  const [activeTab, setActiveTab] = useState<WordCloudTab>("positive");

  const words = reputationWordCloud[activeTab];

  return (
    <div className="chart-card flex-1">
      <div className="chart-header">
        <h3>
          <i className="fas fa-cloud"></i> 키워드 워드클라우드
        </h3>

        <div className="tab-filter">
          <button
            className={`filter-btn ${activeTab === "positive" ? "active" : ""}`}
            onClick={() => setActiveTab("positive")}
          >
            긍정
          </button>

          <button
            className={`filter-btn ${activeTab === "negative" ? "active" : ""}`}
            onClick={() => setActiveTab("negative")}
          >
            부정
          </button>

          <button
            className={`filter-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            전체
          </button>
        </div>
      </div>

      <div className="wordcloud-container">
        {words.map((word) => (
          <span
            key={`${activeTab}-${word.text}`}
            className="word-item"
            style={{
              fontSize: `${word.size}px`,
              color: word.color,
              background: `${word.color}18`,
              border: `1px solid ${word.color}30`,
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
    </div>
  );
}