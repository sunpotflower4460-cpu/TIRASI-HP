import "../../styles/admin-entry-link.css";

export function AdminEntryLink({ onEdit }: { onEdit?: () => void }) {
  if (!onEdit) return null;

  return (
    <div className="admin-entry-link-wrap">
      <button type="button" className="admin-entry-link" onClick={onEdit}>
        管理
      </button>
    </div>
  );
}
