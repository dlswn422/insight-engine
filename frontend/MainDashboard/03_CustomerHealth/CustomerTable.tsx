export default function CustomerTable() {
  return (
    <div className="chart-card no-pad">
      <table className="customer-table" id="customerTable">
        <thead>
          <tr>
            <th>상태</th>
            <th>고객사명</th>
            <th>업종</th>
            <th>건강도 점수</th>
            <th>이탈 위험도</th>
            <th>발주 추이</th>
            <th>주요 신호</th>
            <th>최근 접촉</th>
            <th>상세</th>
          </tr>
        </thead>

        <tbody id="customerTableBody">
          <tr>
            <td>🔴</td>
            <td>한미약품</td>
            <td>제약</td>
            <td>31</td>
            <td>87%</td>
            <td>-23%</td>
            <td>경쟁사 접촉 / 발주 감소 / 담당자 교체</td>
            <td>15일 전</td>
            <td>
              <button>상세보기</button>
            </td>
          </tr>

          <tr>
            <td>🔴</td>
            <td>동아ST</td>
            <td>제약</td>
            <td>38</td>
            <td>79%</td>
            <td>-14%</td>
            <td>입찰 불참 / 품질 클레임</td>
            <td>8일 전</td>
            <td>
              <button>상세보기</button>
            </td>
          </tr>

          <tr>
            <td>🔴</td>
            <td>일동제약</td>
            <td>제약</td>
            <td>42</td>
            <td>65%</td>
            <td>-9%</td>
            <td>소통 단절 / 발주 감소</td>
            <td>20일 전</td>
            <td>
              <button>상세보기</button>
            </td>
          </tr>

          <tr>
            <td>🟡</td>
            <td>보령제약</td>
            <td>제약</td>
            <td>61</td>
            <td>42%</td>
            <td>+5%</td>
            <td>임상 3상 진입 / 경쟁사 접촉</td>
            <td>3일 전</td>
            <td>
              <button>상세보기</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}