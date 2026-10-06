import { Link } from "react-router-dom";
import EmptyState from "../common/EmptyState";
import StatusBadge from "../common/StatusBadge";
import PageHeader from "../common/PageHeader";
import "../../pages/admin/AdminPages.css";
import "./RoleDashboards.css";

export const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatStamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const DashboardShell = ({ title, children }) => (
  <div className="admin-dashboard-page role-dashboard animate-fade-in">
    <PageHeader title={title} />
    {children}
  </div>
);

export const Panel = ({ title, action, children }) => (
  <section className="admin-panel-card">
    <div className="admin-panel-header">
      <h3 className="admin-panel-title">{title}</h3>
      {action ? <div className="role-panel-action">{action}</div> : null}
    </div>
    {children}
  </section>
);

export const TextLink = ({ to, children }) => (
  <Link to={to} className="role-text-link">
    {children}
  </Link>
);

export const Facts = ({ rows }) => {
  const visible = rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== "");
  if (!visible.length) return null;

  return (
    <div className="phase1-detail role-facts">
      {visible.map((row) => (
        <div className="phase1-detail-row" key={row.label}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
};

export const Split = ({ children }) => (
  <div className="role-dashboard-split">{children}</div>
);

export const UpdateList = ({ items, emptyTitle, emptyDescription }) => {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="role-update-list">
      {items.map((item) => (
        <li key={item.id}>
          <div className="role-update-top">
            <strong>{item.title}</strong>
            {item.when ? <span>{item.when}</span> : null}
          </div>
          {item.body ? <p>{item.body}</p> : null}
        </li>
      ))}
    </ul>
  );
};

export const PaperList = ({ papers, emptyTitle, emptyDescription }) => {
  if (!papers.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="role-paper-list">
      {papers.map((paper) => (
        <article key={paper.id} className="role-paper">
          <div className="role-paper-head">
            <div>
              <h4>{paper.title}</h4>
              {paper.meta ? <p>{paper.meta}</p> : null}
            </div>
            {paper.status ? <StatusBadge status={paper.status} size="sm" /> : null}
          </div>
          <Facts rows={paper.rows || []} />
        </article>
      ))}
    </div>
  );
};

export const ActionList = ({ items, emptyTitle, emptyDescription }) => {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ul className="role-action-list">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <strong>{item.title}</strong>
            {item.body ? <p>{item.body}</p> : null}
          </div>
          {item.to ? <TextLink to={item.to}>Review</TextLink> : null}
        </li>
      ))}
    </ul>
  );
};
