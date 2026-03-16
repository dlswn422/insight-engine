import { supabase } from "./supabase";

/**
 * 기업명 정규화 함수
 * (주), ㈜, 주식회사 및 공백 제거
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .replace(/\(주\)|㈜|주식회사/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export type CompanyRole = "OWN" | "CLIENT" | "POTENTIAL" | "GENERAL";

export interface CompanyInfo {
  role: CompanyRole;
  originalName: string;
}

/**
 * managed_clients와 industry_targets를 대조하여 기업별 Role 맵 생성
 * Key: 정규화된 이름
 */
export async function getCompanyRoles(): Promise<Map<string, CompanyInfo>> {
  const roleMap = new Map<string, CompanyInfo>();

  try {
    // 1. managed_clients 조회
    const { data: managed } = await supabase
      .from("managed_clients")
      .select("id, company_name");

    if (managed) {
      for (const row of managed) {
        const norm = normalizeName(row.company_name);
        // id 1은 자사(OWN), 나머지는 고객사(CLIENT)
        const role: CompanyRole = row.id === 1 ? "OWN" : "CLIENT";
        roleMap.set(norm, { role, originalName: row.company_name });
      }
    }

    // 2. industry_targets 조회 (잠재고객)
    const { data: targets } = await supabase
      .from("industry_targets")
      .select("company_name");

    if (targets) {
      for (const row of targets) {
        const norm = normalizeName(row.company_name);
        // 이미 managed_clients에 있으면 덮어쓰지 않음
        if (!roleMap.has(norm)) {
          roleMap.set(norm, { role: "POTENTIAL", originalName: row.company_name });
        }
      }
    }
  } catch (error) {
    console.error("[getCompanyRoles] Error fetching roles:", error);
  }

  return roleMap;
}
