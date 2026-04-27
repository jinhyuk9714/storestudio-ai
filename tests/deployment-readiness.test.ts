import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("beta deployment readiness artifacts", () => {
  it("runs the required checks in GitHub Actions on main pushes and pull requests", () => {
    const workflow = read(".github/workflows/ci.yml");

    expect(workflow).toContain("push:");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("npx tsc --noEmit");
    expect(workflow).toContain("npm run build");
  });

  it("documents the production setup checklist and required integrations", () => {
    const readme = read("README.md");

    expect(readme).toContain("Production Setup Checklist");
    expect(readme).toContain("Vercel");
    expect(readme).toContain("Supabase");
    expect(readme).toContain("Cloudflare R2");
    expect(readme).toContain("Trigger.dev");
    expect(readme).toContain("Toss Payments");
    expect(readme).toContain("OpenAI");
  });

  it("provides production smoke and beta QA templates", () => {
    const smoke = read("docs/production-smoke.md");
    const qa = read("docs/beta-qa-template.csv");

    expect(smoke).toContain("magic-link login");
    expect(smoke).toContain("ZIP export");
    expect(smoke).toContain("duplicate webhook");
    expect(qa).toContain("decision");
    expect(qa).toContain("그대로 업로드 가능");
    expect(qa).toContain("수정 필요");
    expect(qa).toContain("사용 불가");
  });
});
