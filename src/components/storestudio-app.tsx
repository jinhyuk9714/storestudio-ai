"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  ImagePlus,
  Loader2,
  Package,
  Sparkles,
  UploadCloud,
  Wand2
} from "lucide-react";
import { CHANNEL_PRESETS, OUTPUT_PRESET_BY_ID } from "@/lib/presets";
import type { Asset, ChannelId, GenerationJob, Project, UserAccount } from "@/lib/types";

type ProjectPayload = Project & {
  channelLabel: string;
  sourceAssets: Asset[];
  jobs: GenerationJob[];
};

type ProjectForm = {
  productName: string;
  category: string;
  tone: string;
  heroCopy: string;
  channel: ChannelId;
};

const INITIAL_FORM: ProjectForm = {
  productName: "비건 립밤",
  category: "화장품",
  tone: "깨끗하고 프리미엄",
  heroCopy: "건조한 입술을 위한 매일의 보습",
  channel: "smartstore"
};

const DEMO_RESULTS = [
  {
    label: "흰 배경 상품컷",
    src: "/demo/white-background.png"
  },
  {
    label: "1:1 썸네일",
    src: "/demo/square-thumbnail.png"
  },
  {
    label: "라이프스타일 컷",
    src: "/demo/lifestyle.png"
  },
  {
    label: "상세페이지 첫 화면",
    src: "/demo/detail-hero.png"
  }
];

export function StoreStudioApp() {
  const [form, setForm] = useState<ProjectForm>(INITIAL_FORM);
  const [email, setEmail] = useState("seller@example.com");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [projects, setProjects] = useState<ProjectPayload[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [resultAssets, setResultAssets] = useState<Asset[]>([]);
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [status, setStatus] = useState<string>("무료 체험 크레딧 3회로 바로 테스트할 수 있습니다.");

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null,
    [activeProjectId, projects]
  );

  useEffect(() => {
    const token = extractSupabaseTokenFromHash() ?? window.localStorage.getItem("storestudio_token");
    if (token) {
      window.localStorage.setItem("storestudio_token", token);
      setAuthToken(token);
    }
    void refreshProjects();
  }, []);

  useEffect(() => {
    void refreshProjects(authToken);
  }, [authToken]);

  function authHeaders(token = authToken): HeadersInit {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function refreshProjects(token = authToken) {
    const response = await fetch("/api/projects", {
      cache: "no-store",
      headers: authHeaders(token)
    });
    const payload = (await response.json()) as {
      user: UserAccount;
      projects: ProjectPayload[];
      error?: string;
    };
    if (!response.ok) {
      setStatus(payload.error ?? "로그인이 필요합니다.");
      return;
    }
    setUser(payload.user);
    setProjects(payload.projects);
    setActiveProjectId((current) => current ?? payload.projects[0]?.id ?? null);
  }

  async function createProject() {
    setIsCreating(true);
    setStatus("상품 프로젝트를 준비하고 있습니다.");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "프로젝트 생성 실패");
      }
      setActiveProjectId(payload.project.id);
      setResultAssets([]);
      setActiveJob(null);
      await refreshProjects();
      setStatus("프로젝트가 준비되었습니다. 상품 사진을 업로드하세요.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "프로젝트 생성 실패");
    } finally {
      setIsCreating(false);
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !activeProject) {
      return;
    }

    const selected = Array.from(files).slice(0, 5);
    setIsUploading(true);
    setStatus(`${selected.length}개 이미지를 업로드하고 있습니다.`);
    try {
      for (const file of selected) {
        const dataUrl = await fileToDataUrl(file);
        const response = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            projectId: activeProject.id,
            fileName: file.name,
            mimeType: file.type,
            dataUrl
          })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "업로드 실패");
        }
      }
      await refreshProjects();
      setStatus("원본 이미지가 연결되었습니다. 이제 판매용 세트를 생성하세요.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "업로드 실패");
    } finally {
      setIsUploading(false);
    }
  }

  async function generateSet() {
    if (!activeProject) {
      setStatus("먼저 프로젝트를 생성하세요.");
      return;
    }

    setIsGenerating(true);
    setStatus("상품컷 4종을 생성하고 있습니다. API 키가 없으면 로컬 샘플 렌더로 진행됩니다.");
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ projectId: activeProject.id })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "생성 실패");
      }
      setActiveJob(payload.job);
      setResultAssets(payload.assets);
      setUser(payload.user);
      await refreshProjects();
      if (payload.job.status === "queued" || payload.job.status === "processing") {
        setStatus("생성 작업이 큐에 들어갔습니다. 완료될 때까지 상태를 확인합니다.");
        await pollGeneration(payload.job.id);
      } else {
        setStatus(payload.job.status === "completed" ? "생성 완료. ZIP으로 내려받을 수 있습니다." : "생성에 실패했습니다.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "생성 실패");
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportZip() {
    if (!activeProject) {
      return;
    }

    setIsExporting(true);
    setStatus("ZIP 파일을 준비하고 있습니다.");
    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          projectId: activeProject.id,
          jobId: activeJob?.id
        })
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "내보내기 실패");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeProject.productName}-storestudio.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("다운로드가 시작되었습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "내보내기 실패");
    } finally {
      setIsExporting(false);
    }
  }

  async function sendMagicLink() {
    setIsSigningIn(true);
    setStatus("로그인 링크를 준비하고 있습니다.");
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "로그인 요청 실패");
      }
      setStatus(
        payload.mode === "supabase"
          ? "이메일로 로그인 링크를 보냈습니다."
          : "로컬 데모 세션으로 계속 진행합니다."
      );
      await refreshProjects();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "로그인 요청 실패");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function pollGeneration(jobId: string) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await delay(1500);
      const response = await fetch(`/api/generations/${jobId}`, {
        cache: "no-store",
        headers: authHeaders()
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "생성 상태 확인 실패");
      }
      setActiveJob(payload.job);
      setResultAssets(payload.assets ?? []);

      if (payload.job.status === "completed") {
        await refreshProjects();
        setStatus("생성 완료. ZIP으로 내려받을 수 있습니다.");
        return;
      }
      if (payload.job.status === "failed") {
        await refreshProjects();
        setStatus(payload.job.error ?? "생성에 실패했습니다.");
        return;
      }
    }
    setStatus("생성이 아직 진행 중입니다. 잠시 후 다시 확인하세요.");
  }

  const visibleResults = resultAssets.length > 0 ? resultAssets : null;

  return (
    <main>
      <section className="hero">
        <div className="heroShade" />
        <nav className="topbar" aria-label="주요 메뉴">
          <a className="brandMark" href="#top" aria-label="StoreStudio AI">
            <Sparkles size={20} />
            StoreStudio AI
          </a>
          <form
            className="authBar"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMagicLink();
            }}
          >
            <input
              type="email"
              value={email}
              aria-label="로그인 이메일"
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={isSigningIn}>
              {isSigningIn ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
              로그인
            </button>
          </form>
        </nav>
        <div className="heroContent" id="top">
          <p className="eyebrow">스마트스토어 · 쿠팡 · 인스타</p>
          <h1>StoreStudio AI</h1>
          <p className="heroCopy">제품 사진 몇 장으로 판매 페이지에 바로 쓰는 상품컷 세트를 만듭니다.</p>
          <div className="heroActions">
            <a className="primaryAction" href="#workspace">
              <Wand2 size={18} />
              샘플 생성
            </a>
            <span className="creditBadge">{user?.credits ?? 3} credits</span>
          </div>
        </div>
      </section>

      <section className="proofBand" aria-label="출력 예시">
        {DEMO_RESULTS.map((result) => (
          <figure className="proofItem" key={result.label}>
            <img src={result.src} alt={`${result.label} 예시`} />
            <figcaption>{result.label}</figcaption>
          </figure>
        ))}
      </section>

      <section className="workspace" id="workspace">
        <div className="workspaceHeader">
          <div>
            <p className="eyebrow">seller workspace</p>
            <h2>상품 등록용 이미지 세트</h2>
          </div>
          <div className="accountPill">
            <Package size={17} />
            {user ? `${user.plan} · ${user.credits} credits` : "trial · 3 credits"}
          </div>
        </div>

        <div className="toolGrid">
          <form
            className="projectPanel"
            onSubmit={(event) => {
              event.preventDefault();
              void createProject();
            }}
          >
            <div className="fieldGroup">
              <label>
                상품명
                <input
                  value={form.productName}
                  onChange={(event) => setForm({ ...form, productName: event.target.value })}
                />
              </label>
              <label>
                카테고리
                <input
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                />
              </label>
              <label>
                톤앤매너
                <input
                  value={form.tone}
                  onChange={(event) => setForm({ ...form, tone: event.target.value })}
                />
              </label>
              <label>
                핵심 문구
                <input
                  value={form.heroCopy}
                  onChange={(event) => setForm({ ...form, heroCopy: event.target.value })}
                />
              </label>
              <label>
                판매 채널
                <select
                  value={form.channel}
                  onChange={(event) =>
                    setForm({ ...form, channel: event.target.value as ChannelId })
                  }
                >
                  {Object.entries(CHANNEL_PRESETS).map(([id, preset]) => (
                    <option value={id} key={id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="buttonRow">
              <button className="solidButton" type="submit" disabled={isCreating}>
                {isCreating ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
                프로젝트 생성
              </button>
            </div>
          </form>

          <div className="runPanel">
            <div className="activeProject">
              <span>현재 프로젝트</span>
              <strong>{activeProject?.productName ?? "아직 없음"}</strong>
              <small>{activeProject?.channelLabel ?? "채널을 선택하고 프로젝트를 만드세요."}</small>
            </div>

            <label className="uploadDrop">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => void uploadFiles(event.target.files)}
                disabled={!activeProject || isUploading}
              />
              {isUploading ? <Loader2 className="spin" size={28} /> : <UploadCloud size={28} />}
              <span>
                {activeProject
                  ? `${activeProject.sourceAssets.length}/5 source images`
                  : "프로젝트 생성 후 업로드"}
              </span>
            </label>

            <div className="outputList">
              {Object.values(OUTPUT_PRESET_BY_ID).map((preset) => (
                <div className="outputLine" key={preset.id}>
                  <ImagePlus size={16} />
                  <span>{preset.label}</span>
                  <small>
                    {preset.size.width}x{preset.size.height}
                  </small>
                </div>
              ))}
            </div>

            <div className="buttonRow">
              <button className="solidButton" onClick={() => void generateSet()} disabled={isGenerating || !activeProject}>
                {isGenerating ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
                4종 생성
              </button>
              <button
                className="ghostButton"
                onClick={() => void exportZip()}
                disabled={isExporting || !activeProject || (!activeJob && resultAssets.length === 0)}
              >
                {isExporting ? <Loader2 className="spin" size={18} /> : <ArrowDownToLine size={18} />}
                ZIP
              </button>
            </div>
            <p className="statusLine">{status}</p>
          </div>
        </div>

        <div className="resultGrid" aria-label="생성 결과">
          {visibleResults
            ? visibleResults.map((asset) => (
                <figure className="resultItem" key={asset.id}>
                  <img src={asset.url} alt={`${asset.outputType ?? "상품"} 생성 결과`} />
                  <figcaption>
                    {asset.outputType ? OUTPUT_PRESET_BY_ID[asset.outputType].label : "생성 결과"}
                  </figcaption>
                </figure>
              ))
            : DEMO_RESULTS.map((result) => (
                <figure className="resultItem muted" key={result.label}>
                  <img src={result.src} alt={`${result.label} 미리보기`} />
                  <figcaption>{result.label}</figcaption>
                </figure>
              ))}
        </div>
      </section>
    </main>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function extractSupabaseTokenFromHash(): string | null {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get("access_token");
  if (token) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return token;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
