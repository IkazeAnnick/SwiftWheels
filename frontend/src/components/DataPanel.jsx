export default function DataPanel({ title, rows, actions }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length === 0 ? <p>No records yet.</p> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {headers.map((header) => <th key={header}>{header}</th>)}
                {actions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {headers.map((header) => <td key={header}>{row[header]}</td>)}
                  {actions && <td>{actions(row, index)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

