import DataPanel from '../components/DataPanel'
import { formatDriverScheduleRow } from '../utils/formatters'

export default function DriverDashboard({ dashboard, passwordForm, setPasswordForm, changePassword, updateForm, loading }) {
  return (
    <section className="dashboard-grid">
      <section className="panel">
        <h2>Dashboard</h2>
        <p>Total customers on your schedules: {dashboard?.total_customers || 0}</p>
      </section>

      <section className="panel">
        <h2>Change Credentials</h2>
        <form className="form-grid" onSubmit={changePassword}>
          <label>Old Password<input type="password" value={passwordForm.old_password} onChange={(event) => updateForm(setPasswordForm, 'old_password', event.target.value)} required /></label>
          <label>New Password<input type="password" value={passwordForm.new_password} onChange={(event) => updateForm(setPasswordForm, 'new_password', event.target.value)} required /></label>
          <button type="submit" disabled={loading}>Change Password</button>
        </form>
      </section>

      <DataPanel title="My Schedules, Routes And Ready Buses" rows={(dashboard?.schedules || []).map(formatDriverScheduleRow)} />
    </section>
  )
}

