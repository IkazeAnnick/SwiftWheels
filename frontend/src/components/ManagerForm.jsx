export default function ManagerForm({ title, children, onSubmit, loading, onCancel, isEditing }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <form className="form-grid" onSubmit={onSubmit}>
        {children}
        <button type="submit" disabled={loading}>Save</button>
        {isEditing && <button type="button" onClick={onCancel}>Cancel</button>}
      </form>
    </section>
  )
}

