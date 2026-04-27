import { readStore } from "@/lib/server/store";

export default async function AdminJobsPage() {
  if (process.env.NODE_ENV === "production" && process.env.ADMIN_UI_ENABLED !== "true") {
    return (
      <main className="adminPage">
        <h1>Admin jobs</h1>
        <p>Production admin UI is disabled. Use GET /api/admin/jobs with ADMIN_TOKEN.</p>
      </main>
    );
  }

  const data = await readStore();
  const refundedJobIds = new Set(
    data.creditLedger
      .filter((entry) => entry.reason === "generation_refund" && entry.jobId)
      .map((entry) => entry.jobId)
  );
  const jobs = data.jobs
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);

  return (
    <main className="adminPage">
      <div className="adminHeader">
        <div>
          <p className="eyebrow">operations</p>
          <h1>Generation jobs</h1>
        </div>
        <span>{jobs.length} jobs</span>
      </div>

      <div className="adminTable" role="table" aria-label="생성 작업 로그">
        <div className="adminRow adminHead" role="row">
          <span>Status</span>
          <span>Product</span>
          <span>User</span>
          <span>Refund</span>
          <span>Error</span>
        </div>
        {jobs.map((job) => {
          const project = data.projects.find((candidate) => candidate.id === job.projectId);
          const user = data.users.find((candidate) => candidate.id === job.userId);
          return (
            <div className="adminRow" role="row" key={job.id}>
              <span>{job.status}</span>
              <span>{project?.productName ?? "-"}</span>
              <span>{user?.email ?? "-"}</span>
              <span>{refundedJobIds.has(job.id) ? "yes" : "no"}</span>
              <span>{job.error ?? "-"}</span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
