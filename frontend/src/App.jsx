import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import './App.css'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
})

const emptyLogin = { email: '', password: '' }
const emptySignup = { full_name: '', email: '', phone: '', password: '' }
const emptyPassword = { old_password: '', new_password: '' }
const emptyBus = { plate_Number: '', total_seat: '' }
const emptyRoute = { source: '', destination: '', price: '' }
const emptyDriver = { full_name: '', email: '', phone: '', password: '', role: 'driver' }
const emptySchedule = { bus_id: '', r_id: '', driver_id: '', departure_time: '', arrival_time: '' }
const emptySearch = { source: '', destination: '', departure_date: '' }
const emptyTicket = { customer_name: '', sch_id: '', seat_number: '' }
const emptyReportFilters = { departure_date: '', r_id: '', sch_id: '' }

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [loginForm, setLoginForm] = useState(emptyLogin)
  const [signupForm, setSignupForm] = useState(emptySignup)
  const [passwordForm, setPasswordForm] = useState(emptyPassword)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [buses, setBuses] = useState([])
  const [routes, setRoutes] = useState([])
  const [drivers, setDrivers] = useState([])
  const [schedules, setSchedules] = useState([])
  const [tickets, setTickets] = useState([])
  const [reportTickets, setReportTickets] = useState([])
  const [reportFilters, setReportFilters] = useState(emptyReportFilters)
  const [appliedReportFilters, setAppliedReportFilters] = useState(emptyReportFilters)
  const [reportViewed, setReportViewed] = useState(false)
  const [driverDashboard, setDriverDashboard] = useState(null)

  const [busForm, setBusForm] = useState(emptyBus)
  const [routeForm, setRouteForm] = useState(emptyRoute)
  const [driverForm, setDriverForm] = useState(emptyDriver)
  const [scheduleForm, setScheduleForm] = useState(emptySchedule)
  const [editing, setEditing] = useState({ type: '', id: null })

  const [searchForm, setSearchForm] = useState(emptySearch)
  const [customerScheduleOptions, setCustomerScheduleOptions] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [ticketForm, setTicketForm] = useState(emptyTicket)
  const [seatInfo, setSeatInfo] = useState(null)
  const [reservedTicket, setReservedTicket] = useState(null)

  const selectedSchedule = useMemo(
    () => searchResults.find((schedule) => String(schedule.sch_id) === String(ticketForm.sch_id)),
    [searchResults, ticketForm.sch_id],
  )

  useEffect(() => {
    api.get('/auth/me')
      .then((response) => setUser(response.data.user))
      .catch(() => setUser(null))
  }, [])

  useEffect(() => {
    if (!user) return

    if (user.role === 'Fleet_Manager') {
      loadManagerData()
    }

    if (user.role === 'driver') {
      loadDriverData()
    }

    if (user.role === 'customer') {
      loadCustomerScheduleOptions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function updateForm(setter, field, value) {
    setter((current) => ({ ...current, [field]: value }))
  }

  async function run(action, successMessage) {
    setLoading(true)
    setMessage('')

    try {
      await action()
      if (successMessage) setMessage(typeof successMessage === 'function' ? successMessage() : successMessage)
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function getReportParams(filters = reportFilters) {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
  }

  async function loadManagerData(filters = reportFilters) {
    const reportParams = getReportParams(filters)
    const [busRes, routeRes, driverRes, scheduleRes, ticketRes, reportTicketRes] = await Promise.all([
      api.get('/buses'),
      api.get('/routes'),
      api.get('/drivers'),
      api.get('/schedules'),
      api.get('/tickets'),
      api.get('/tickets', { params: reportParams }),
    ])

    setBuses(busRes.data)
    setRoutes(routeRes.data)
    setDrivers(driverRes.data)
    setSchedules(scheduleRes.data)
    setTickets(ticketRes.data)
    setReportTickets(reportTicketRes.data)
    setAppliedReportFilters(filters)
  }

  async function loadDriverData() {
    const response = await api.get('/driver/dashboard')
    setDriverDashboard(response.data)
  }

  async function loadCustomerScheduleOptions() {
    const response = await api.get('/customer/schedule-options')
    setCustomerScheduleOptions(response.data)
  }

  async function login(event) {
    event.preventDefault()
    await run(async () => {
      const response = await api.post('/auth/login', loginForm)
      setUser(response.data.user)
      setLoginForm(emptyLogin)
    }, 'Login successful.')
  }

  async function signup(event) {
    event.preventDefault()
    await run(async () => {
      const response = await api.post('/auth/signup', signupForm)
      setUser(response.data.user)
      setSignupForm(emptySignup)
    }, 'Account created successfully.')
  }

  async function logout() {
    await run(async () => {
      await api.post('/auth/logout')
      setUser(null)
      setReportTickets([])
      setReportFilters(emptyReportFilters)
      setAppliedReportFilters(emptyReportFilters)
      setReportViewed(false)
      setDriverDashboard(null)
      setCustomerScheduleOptions([])
      setSearchResults([])
      setTicketForm(emptyTicket)
      setSeatInfo(null)
      setReservedTicket(null)
    }, 'Logged out successfully.')
  }

  async function changePassword(event) {
    event.preventDefault()
    await run(async () => {
      await api.put('/auth/change-password', passwordForm)
      setPasswordForm(emptyPassword)
    }, 'Password changed successfully.')
  }

  function startEdit(type, record) {
    setEditing({ type, id: record.bus_id || record.r_id || record.user_id || record.sch_id || record.ticket_id })

    if (type === 'bus') setBusForm({ plate_Number: record.plate_Number, total_seat: record.total_seat })
    if (type === 'route') setRouteForm({ source: record.source, destination: record.destination, price: record.price })
    if (type === 'driver') {
      setDriverForm({
        full_name: record.full_name,
        email: record.email,
        phone: record.phone || '',
        password: '',
        role: 'driver',
      })
    }
    if (type === 'schedule') {
  setScheduleForm({
    bus_id: record.bus_id,
    r_id: record.r_id,
    driver_id: record.driver_id || '',
    departure_time: toDatetimeLocal(record.departure_time),
    arrival_time: toDatetimeLocal(record.arrival_time),
  })
}
    if (type === 'ticket') {
      setTicketForm({
        customer_name: record.customer_name,
        sch_id: record.sch_id,
        seat_number: record.seat_number,
      })
    }
  }

  function cancelEdit() {
    setEditing({ type: '', id: null })
    setBusForm(emptyBus)
    setRouteForm(emptyRoute)
    setDriverForm(emptyDriver)
    setScheduleForm(emptySchedule)
    setTicketForm(emptyTicket)
  }

  async function saveBus(event) {
    event.preventDefault()
    await run(async () => {
      if (editing.type === 'bus') {
        await api.put(`/buses/${editing.id}`, busForm)
      } else {
        await api.post('/buses', busForm)
      }
      cancelEdit()
      await loadManagerData()
    }, 'Bus saved successfully.')
  }

  async function saveRoute(event) {
    event.preventDefault()
    await run(async () => {
      if (editing.type === 'route') {
        await api.put(`/routes/${editing.id}`, routeForm)
      } else {
        await api.post('/routes', routeForm)
      }
      cancelEdit()
      await loadManagerData()
    }, 'Route saved successfully.')
  }

  async function saveDriver(event) {
    event.preventDefault()
    await run(async () => {
      if (editing.type === 'driver') {
        await api.put(`/users/${editing.id}`, driverForm)
      } else {
        await api.post('/users', driverForm)
      }
      cancelEdit()
      await loadManagerData()
    }, 'Driver saved successfully.')
  }

  async function saveSchedule(event) {
    event.preventDefault()
    await run(async () => {
      if (editing.type === 'schedule') {
        await api.put(`/schedules/${editing.id}`, scheduleForm)
      } else {
        await api.post('/schedules', scheduleForm)
      }
      cancelEdit()
      await loadManagerData()
    }, 'Schedule saved successfully.')
  }

  async function deleteRecord(type, id) {
    const endpoints = {
      bus: `/buses/${id}`,
      route: `/routes/${id}`,
      driver: `/users/${id}`,
      schedule: `/schedules/${id}`,
      ticket: `/tickets/${id}`,
    }

    await run(async () => {
      await api.delete(endpoints[type])
      await loadManagerData()
    }, 'Record deleted successfully.')
  }

  async function applyReportFilters(event) {
    event.preventDefault()
    let reportCount = 0

    await run(async () => {
      const reportParams = getReportParams(reportFilters)
      const response = await api.get('/tickets', {
        params: reportParams,
      })

      reportCount = response.data.length
      setReportTickets(response.data)
      setAppliedReportFilters(reportFilters)
      setReportViewed(true)
    }, () => `Report loaded with ${reportCount} matching record${reportCount === 1 ? '' : 's'}.`)
  }

  async function clearReportFilters() {
    setReportFilters(emptyReportFilters)

    await run(async () => {
      const response = await api.get('/tickets')

      setReportTickets(response.data)
      setAppliedReportFilters(emptyReportFilters)
      setReportViewed(false)
    }, 'Report filters cleared.')
  }

  function printReport() {
    if (reportTickets.length === 0) {
      setMessage('No report records to print.')
      return
    }

    const printedAt = formatDateTime(new Date())
    const filterSummary = getReportFilterSummary(appliedReportFilters, routes, schedules)
    const rows = reportTickets.map((ticket) => `
      <tr>
        <td>${escapeHtml(ticket.ticket_id)}</td>
        <td>${escapeHtml(ticket.customer_name)}</td>
        <td>${escapeHtml(ticket.source)} to ${escapeHtml(ticket.destination)}</td>
        <td>${escapeHtml(ticket.plate_Number)}</td>
        <td>${escapeHtml(ticket.seat_number)}</td>
        <td>${escapeHtml(formatDateTime(ticket.departure_time))}</td>
        <td>${escapeHtml(formatDateTime(ticket.arrival_time))}</td>
        <td>${escapeHtml(ticket.price)} RWF</td>
      </tr>
    `).join('')
    const totalRevenue = reportTickets.reduce((sum, ticket) => sum + Number(ticket.price || 0), 0)
    const printWindow = window.open('', '_blank', 'width=900,height=700')

    if (!printWindow) {
      setMessage('Please allow popups to print the report.')
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Swift Wheels Report</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #f9fafb; }
            main { max-width: 1100px; margin: 0 auto; padding: 32px; background: #ffffff; min-height: 100vh; }
            header { border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 18px; }
            h1 { margin: 0 0 6px; font-size: 28px; }
            p { margin: 4px 0; color: #374151; }
            .toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
            button { border: 0; border-radius: 8px; background: #16a34a; color: white; padding: 10px 16px; font-weight: 700; cursor: pointer; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
            .summary-card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f3f4f6; }
            .summary-card strong { display: block; font-size: 20px; color: #111827; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #e5e7eb; color: #111827; }
            @media print {
              body { background: #ffffff; }
              main { max-width: none; padding: 0; }
              .toolbar { display: none; }
            }
          </style>
        </head>
        <body>
          <main>
            <div class="toolbar">
              <button type="button" onclick="window.print()">Print Report</button>
            </div>
            <header>
              <h1>Swift Wheels Report</h1>
              <p>Generated: ${escapeHtml(printedAt)}</p>
              <p>Applied filters: ${escapeHtml(filterSummary)}</p>
            </header>
            <section class="summary-grid" aria-label="Report summary">
              <div class="summary-card"><span>Total Tickets</span><strong>${reportTickets.length}</strong></div>
              <div class="summary-card"><span>Total Revenue</span><strong>${totalRevenue} RWF</strong></div>
              <div class="summary-card"><span>Routes Included</span><strong>${new Set(reportTickets.map((ticket) => `${ticket.source}-${ticket.destination}`)).size}</strong></div>
            </section>
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Bus</th>
                  <th>Seat</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </main>
          <script>
            window.addEventListener('load', () => window.print())
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  async function searchSchedules(event) {
    event.preventDefault()
    await run(async () => {
      const response = await api.get('/search', { params: searchForm })
      setSearchResults(response.data)
      setTicketForm(emptyTicket)
      setSeatInfo(null)
      setReservedTicket(null)
    }, 'Available schedules loaded.')
  }

  async function chooseSchedule(schedule) {
    try {
      setTicketForm((current) => ({ ...current, sch_id: schedule.sch_id, seat_number: '' }))
      const response = await api.get(`/schedules/${schedule.sch_id}/seats`)
      setSeatInfo(response.data)
      setMessage('')
    } catch (err) {
      setTicketForm(emptyTicket)
      setSeatInfo(null)
      setMessage(err.response?.data?.message || 'This schedule is not available.')
      await loadCustomerScheduleOptions()
    }
  }

  async function reserveTicket(event) {
    event.preventDefault()
    await run(async () => {
      const response = await api.post('/tickets', ticketForm)
      setReservedTicket(response.data.ticket)
      await loadCustomerScheduleOptions()
      await chooseSchedule({ sch_id: ticketForm.sch_id })
    }, 'Ticket reserved successfully.')
  }

  if (!user) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        loginForm={loginForm}
        signupForm={signupForm}
        setLoginForm={setLoginForm}
        setSignupForm={setSignupForm}
        login={login}
        signup={signup}
        updateForm={updateForm}
        message={message}
        loading={loading}
      />
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Swift Wheels</p>
          <h1>{dashboardTitle(user.role)}</h1>
        </div>

        <div className="toolbar">
          <span>{user.full_name}</span>
          <button type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      {message && <p role="status" className="status-message">{message}</p>}

      {user.role === 'Fleet_Manager' && (
        <FleetManagerDashboard
          buses={buses}
          routes={routes}
          drivers={drivers}
          schedules={schedules}
          tickets={tickets}
          reportTickets={reportTickets}
          reportFilters={reportFilters}
          appliedReportFilters={appliedReportFilters}
          reportViewed={reportViewed}
          busForm={busForm}
          routeForm={routeForm}
          driverForm={driverForm}
          scheduleForm={scheduleForm}
          setBusForm={setBusForm}
          setRouteForm={setRouteForm}
          setDriverForm={setDriverForm}
          setScheduleForm={setScheduleForm}
          setReportFilters={setReportFilters}
          saveBus={saveBus}
          saveRoute={saveRoute}
          saveDriver={saveDriver}
          saveSchedule={saveSchedule}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          deleteRecord={deleteRecord}
          applyReportFilters={applyReportFilters}
          clearReportFilters={clearReportFilters}
          printReport={printReport}
          editing={editing}
          loading={loading}
          updateForm={updateForm}
        />
      )}

      {user.role === 'driver' && (
        <DriverDashboard
          dashboard={driverDashboard}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          changePassword={changePassword}
          updateForm={updateForm}
          loading={loading}
        />
      )}

      {user.role === 'customer' && (
        <CustomerDashboard
          searchForm={searchForm}
          setSearchForm={setSearchForm}
          scheduleOptions={customerScheduleOptions}
          searchSchedules={searchSchedules}
          searchResults={searchResults}
          chooseSchedule={chooseSchedule}
          selectedSchedule={selectedSchedule}
          ticketForm={ticketForm}
          setTicketForm={setTicketForm}
          seatInfo={seatInfo}
          reservedTicket={reservedTicket}
          reserveTicket={reserveTicket}
          updateForm={updateForm}
          loading={loading}
        />
      )}
    </main>
  )
}

function AuthPage({
  authMode,
  setAuthMode,
  loginForm,
  signupForm,
  setLoginForm,
  setSignupForm,
  login,
  signup,
  updateForm,
  message,
  loading,
}) {
  return (
    <main className="auth-shell">
      <header>
        <p className="eyebrow">Swift Wheels</p>
        <h1>Bus Ticket Permission System</h1>
      </header>

      <nav className="app-nav" aria-label="Authentication">
        <button type="button" onClick={() => setAuthMode('login')}>Login</button>
        <button type="button" onClick={() => setAuthMode('signup')}>Customer Signup</button>
      </nav>

      {message && <p role="status" className="status-message">{message}</p>}

      {authMode === 'login' ? (
        <form className="form-grid" onSubmit={login}>
          <label>
            Email
            <input
              type="email"
              value={loginForm.email}
              onChange={(event) => updateForm(setLoginForm, 'email', event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={loginForm.password}
              onChange={(event) => updateForm(setLoginForm, 'password', event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>Login</button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={signup}>
          <label>
            Full Name
            <input
              value={signupForm.full_name}
              onChange={(event) => updateForm(setSignupForm, 'full_name', event.target.value)}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={signupForm.email}
              onChange={(event) => updateForm(setSignupForm, 'email', event.target.value)}
              required
            />
          </label>
          <label>
            Phone
            <input
              value={signupForm.phone}
              onChange={(event) => updateForm(setSignupForm, 'phone', event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={signupForm.password}
              onChange={(event) => updateForm(setSignupForm, 'password', event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={loading}>Create Customer Account</button>
        </form>
      )}
    </main>
  )
}

function FleetManagerDashboard(props) {
  const [managerPage, setManagerPage] = useState('reports')
  const managerPages = [
    ['reports', 'Reports'],
    ['buses', 'Buses'],
    ['routes', 'Routes'],
    ['drivers', 'Drivers'],
    ['schedules', 'Schedules'],
    ['tickets', 'Tickets'],
  ]
  const reportTotalRevenue = props.reportTickets.reduce((sum, ticket) => sum + Number(ticket.price || 0), 0)
  const reportRouteCount = new Set(
    props.reportTickets.map((ticket) => `${ticket.source}-${ticket.destination}`),
  ).size
  const reportFilterSummary = getReportFilterSummary(props.appliedReportFilters, props.routes, props.schedules)

  return (
    <section className="manager-shell">
      <nav className="manager-nav" aria-label="Fleet manager pages">
        {managerPages.map(([page, label]) => (
          <button
            key={page}
            type="button"
            className={managerPage === page ? 'active' : undefined}
            onClick={() => {
              props.cancelEdit()
              setManagerPage(page)
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="dashboard-grid">
        {managerPage === 'reports' && (
  <>
    <section className="panel">
      <h2>View Reports</h2>

      <form className="form-grid" onSubmit={props.applyReportFilters}>
        <label>
          Date
          <input
            type="date"
            value={props.reportFilters.departure_date}
            onChange={(event) =>
              props.updateForm(
                props.setReportFilters,
                'departure_date',
                event.target.value
              )
            }
          />
        </label>

        <label>
          Route
          <select
            value={props.reportFilters.r_id}
            onChange={(event) =>
              props.updateForm(
                props.setReportFilters,
                'r_id',
                event.target.value
              )
            }
          >
            <option value="">Select Route</option>

            {props.routes.map((route) => (
              <option key={route.r_id} value={route.r_id}>
                {route.source} to {route.destination}
              </option>
            ))}
          </select>
        </label>

        <label>
          Schedule
          <select
            value={props.reportFilters.sch_id}
            onChange={(event) =>
              props.updateForm(
                props.setReportFilters,
                'sch_id',
                event.target.value
              )
            }
          >
            <option value="">Select Schedule</option>

            {props.schedules.map((schedule) => (
              <option
                key={schedule.sch_id}
                value={schedule.sch_id}
              >
                {formatScheduleOption(schedule)}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={props.loading}>
          View Report
        </button>

        <button
          type="button"
          onClick={props.clearReportFilters}
          disabled={props.loading}
        >
          Clear
        </button>

        <button
          type="button"
          onClick={props.printReport}
          disabled={props.loading || props.reportTickets.length === 0}
        >
          Print Report
        </button>
      </form>
    </section>
    

    <section className="panel report-panel">
      <div className="report-heading">
        <div>
          <p className="eyebrow">Report Results</p>
          <h2>{props.reportViewed ? 'Filtered Report' : 'Full Report Details'}</h2>
          <p>Applied filters: {reportFilterSummary}</p>
        </div>
      </div>

      {props.reportTickets.length === 0 ? (
        <p>{props.reportViewed ? 'No matching records found for the selected filters.' : 'No report records found yet.'}</p>
      ) : (
        <>
          <div className="report-grid">
            <div>
              <span>Total tickets</span>
              <strong>{props.reportTickets.length}</strong>
            </div>
            <div>
              <span>Total revenue</span>
              <strong>{reportTotalRevenue} RWF</strong>
            </div>
            <div>
              <span>Routes included</span>
              <strong>{reportRouteCount}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Bus</th>
                  <th>Seat</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Price</th>
                </tr>
              </thead>

              <tbody>
                {props.reportTickets.map((ticket) => (
                  <tr key={ticket.ticket_id}>
                    <td>{ticket.ticket_id}</td>
                    <td>{ticket.customer_name}</td>

                    <td>
                      {ticket.source} to {ticket.destination}
                    </td>

                    <td>{ticket.plate_Number}</td>

                    <td>{ticket.seat_number}</td>

                    <td>
                      {formatDateTime(ticket.departure_time)}
                    </td>

                    <td>
                      {formatDateTime(ticket.arrival_time)}
                    </td>

                    <td>{ticket.price} RWF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  </>
)}

        {managerPage === 'buses' && (
          <>
            <ManagerForm title={props.editing.type === 'bus' ? 'Edit Bus' : 'Register New Bus'} onSubmit={props.saveBus} loading={props.loading} onCancel={props.cancelEdit} isEditing={props.editing.type === 'bus'}>
              <label>Plate Number<input value={props.busForm.plate_Number} onChange={(event) => props.updateForm(props.setBusForm, 'plate_Number', event.target.value)} required /></label>
              <label>Total Seats<input type="number" min="1" value={props.busForm.total_seat} onChange={(event) => props.updateForm(props.setBusForm, 'total_seat', event.target.value)} required /></label>
            </ManagerForm>
            <DataPanel title="Buses" rows={props.buses.map(formatBusRow)} actions={(row, rawIndex) => rowActions('bus', props.buses[rawIndex].bus_id, props.buses[rawIndex], props)} />
          </>
        )}

        {managerPage === 'routes' && (
          <>
            <ManagerForm title={props.editing.type === 'route' ? 'Edit Route' : 'Set Up Route'} onSubmit={props.saveRoute} loading={props.loading} onCancel={props.cancelEdit} isEditing={props.editing.type === 'route'}>
              <label>Source<input value={props.routeForm.source} onChange={(event) => props.updateForm(props.setRouteForm, 'source', event.target.value)} required /></label>
              <label>Destination<input value={props.routeForm.destination} onChange={(event) => props.updateForm(props.setRouteForm, 'destination', event.target.value)} required /></label>
              <label>Price<input type="number" min="1" value={props.routeForm.price} onChange={(event) => props.updateForm(props.setRouteForm, 'price', event.target.value)} required /></label>
            </ManagerForm>
            <DataPanel title="Routes" rows={props.routes.map(formatRouteRow)} actions={(row, rawIndex) => rowActions('route', props.routes[rawIndex].r_id, props.routes[rawIndex], props)} />
          </>
        )}

        {managerPage === 'drivers' && (
          <>
            <ManagerForm title={props.editing.type === 'driver' ? 'Edit Driver' : 'Add New Driver'} onSubmit={props.saveDriver} loading={props.loading} onCancel={props.cancelEdit} isEditing={props.editing.type === 'driver'}>
              <label>Full Name<input value={props.driverForm.full_name} onChange={(event) => props.updateForm(props.setDriverForm, 'full_name', event.target.value)} required /></label>
              <label>Email<input type="email" value={props.driverForm.email} onChange={(event) => props.updateForm(props.setDriverForm, 'email', event.target.value)} required /></label>
              <label>Phone<input value={props.driverForm.phone} onChange={(event) => props.updateForm(props.setDriverForm, 'phone', event.target.value)} /></label>
              <label>Password<input type="password" value={props.driverForm.password} onChange={(event) => props.updateForm(props.setDriverForm, 'password', event.target.value)} required={props.editing.type !== 'driver'} /></label>
            </ManagerForm>
            <DataPanel title="Drivers" rows={props.drivers.map(formatDriverRow)} actions={(row, rawIndex) => rowActions('driver', props.drivers[rawIndex].user_id, props.drivers[rawIndex], props)} />
          </>
        )}

        {managerPage === 'schedules' && (
          <>
            <ManagerForm title={props.editing.type === 'schedule' ? 'Edit Schedule' : 'Map Bus To Route'} onSubmit={props.saveSchedule} loading={props.loading} onCancel={props.cancelEdit} isEditing={props.editing.type === 'schedule'}>
              <label>Bus<select value={props.scheduleForm.bus_id} onChange={(event) => props.updateForm(props.setScheduleForm, 'bus_id', event.target.value)} required><option value="">Choose bus</option>{props.buses.map((bus) => <option key={bus.bus_id} value={bus.bus_id}>{bus.plate_Number}</option>)}</select></label>
              <label>Route<select value={props.scheduleForm.r_id} onChange={(event) => props.updateForm(props.setScheduleForm, 'r_id', event.target.value)} required><option value="">Choose route</option>{props.routes.map((route) => <option key={route.r_id} value={route.r_id}>{route.source} to {route.destination}</option>)}</select></label>
              <label>Driver<select value={props.scheduleForm.driver_id} onChange={(event) => props.updateForm(props.setScheduleForm, 'driver_id', event.target.value)}><option value="">No driver yet</option>{props.drivers.map((driver) => <option key={driver.user_id} value={driver.user_id}>{driver.full_name}</option>)}</select></label>
              <label>Departure<input type="datetime-local" value={props.scheduleForm.departure_time} onChange={(event) => props.updateForm(props.setScheduleForm, 'departure_time', event.target.value)} required /></label>
              <label>Arrival<input type="datetime-local"value={props.scheduleForm.arrival_time}onChange={(event) =>props.updateForm(props.setScheduleForm,'arrival_time',event.target.value)}required/></label>
            </ManagerForm>
            <DataPanel title="Schedules" rows={props.schedules.map(formatScheduleRow)} actions={(row, rawIndex) => rowActions('schedule', props.schedules[rawIndex].sch_id, props.schedules[rawIndex], props)} />
          </>
        )}

        {managerPage === 'tickets' && (
          <DataPanel title="Tickets" rows={props.tickets.map(formatTicketRow)} actions={(row, rawIndex) => rowActions('ticket', props.tickets[rawIndex].ticket_id, props.tickets[rawIndex], props)} />
        )}
      </section>
    </section>
  )
}

function ManagerForm({ title, children, onSubmit, loading, onCancel, isEditing }) {
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

function DriverDashboard({ dashboard, passwordForm, setPasswordForm, changePassword, updateForm, loading }) {
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

function CustomerDashboard(props) {
  const sourceOptions = uniqueValues(props.scheduleOptions.map((schedule) => schedule.source))
  const destinationOptions = uniqueValues(
    props.scheduleOptions
      .filter((schedule) => !props.searchForm.source || schedule.source === props.searchForm.source)
      .map((schedule) => schedule.destination),
  )

  return (
    <section className="dashboard-grid">
      <section className="panel">
        <h2>Find Trip</h2>
        <form className="form-grid" onSubmit={props.searchSchedules}>
          <label>
            Source
            <select
              value={props.searchForm.source}
              onChange={(event) => {
                props.setSearchForm((current) => ({
                  ...current,
                  source: event.target.value,
                  destination: '',
                }))
              }}
              required
            >
              <option value="">Choose source</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </label>
          <label>
            Destination
            <select
              value={props.searchForm.destination}
              onChange={(event) => props.updateForm(props.setSearchForm, 'destination', event.target.value)}
              required
              disabled={!props.searchForm.source}
            >
              <option value="">Choose destination</option>
              {destinationOptions.map((destination) => (
                <option key={destination} value={destination}>{destination}</option>
              ))}
            </select>
          </label>
          <label>Departure Date<input type="date" value={props.searchForm.departure_date} onChange={(event) => props.updateForm(props.setSearchForm, 'departure_date', event.target.value)} required /></label>
          {/* <label>Departure Time<input type="time" value={props.searchForm.departure_time} onChange={(event) => props.updateForm(props.setSearchForm, 'departure_time', event.target.value)} required /></label> */}
          <button type="submit" disabled={props.loading}>Search</button>
        </form>
        {props.scheduleOptions.length === 0 && <p>No available schedules are open for booking.</p>}
      </section>

      <section className="panel">
        <h2>Available Bus Schedules</h2>
        {props.searchResults.length === 0 ? <p>No schedules loaded.</p> : props.searchResults.map((schedule) => (
          <article className="list-item" key={schedule.sch_id}>
            <h3>{schedule.source} to {schedule.destination}</h3>
            <p>Departure: {formatDateTime(schedule.departure_time)}</p>
            <p>Bus: {schedule.plate_Number}</p>
            <p>Driver: {schedule.driver_name || 'Not assigned'}</p>
            <p>Price: {schedule.price} RWF</p>
            <p>Available seats: {schedule.available_seats}</p>
            <button
              type="button"
              onClick={() => props.chooseSchedule(schedule)}
              disabled={Number(schedule.available_seats) <= 0}
            >
              Select
            </button>
          </article>
        ))}
      </section>

      {props.selectedSchedule && (
        <section className="panel">
          <h2>Reserve Ticket</h2>
          <form className="form-grid" onSubmit={props.reserveTicket}>
            <label>Customer Name<input value={props.ticketForm.customer_name} onChange={(event) => props.updateForm(props.setTicketForm, 'customer_name', event.target.value)} required /></label>
            <label>Seat<select value={props.ticketForm.seat_number} onChange={(event) => props.updateForm(props.setTicketForm, 'seat_number', event.target.value)} required><option value="">Choose seat</option>{props.seatInfo?.available.map((seat) => <option key={seat} value={seat}>Seat {seat}</option>)}</select></label>
            <p>Price: {props.selectedSchedule.price} RWF</p>
            <button type="submit" disabled={props.loading}>Reserve Ticket</button>
          </form>
        </section>
      )}

      {props.reservedTicket && (
        <section className="panel">
          <h2>Reserved Ticket</h2>
          <p>Ticket #{props.reservedTicket.ticket_id}</p>
          <p>{props.reservedTicket.customer_name}</p>
          <p>Seat {props.reservedTicket.seat_number}</p>
          <p>{props.reservedTicket.source} to {props.reservedTicket.destination}</p>
          <p>{formatDateTime(props.reservedTicket.departure_time)}</p>
        </section>
      )}
    </section>
  )
}

function DataPanel({ title, rows, actions }) {
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

function rowActions(type, id, record, props) {
  return (
    <div className="row-actions">
      {type !== 'ticket' && <button type="button" onClick={() => props.startEdit(type, record)}>Edit</button>}
      <button type="button" onClick={() => props.deleteRecord(type, id)}>Delete</button>
    </div>
  )
}

function dashboardTitle(role) {
  if (role === 'Fleet_Manager') return 'Fleet Manager Dashboard'
  if (role === 'driver') return 'Driver Dashboard'
  return 'Customer Dashboard'
}

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function getReportFilterSummary(filters, routes, schedules) {
  const parts = []

  if (filters.departure_date) {
    parts.push(`Date: ${filters.departure_date}`)
  }

  if (filters.r_id) {
    const route = routes.find((item) => String(item.r_id) === String(filters.r_id))
    parts.push(route ? `Route: ${route.source} to ${route.destination}` : `Route ID: ${filters.r_id}`)
  }

  if (filters.sch_id) {
    const schedule = schedules.find((item) => String(item.sch_id) === String(filters.sch_id))
    parts.push(schedule ? `Schedule: ${formatScheduleOption(schedule)}` : `Schedule ID: ${filters.sch_id}`)
  }

  return parts.length ? parts.join(', ') : 'All records'
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatScheduleOption(schedule) {
  return `${schedule.source} to ${schedule.destination} - ${formatDateTime(schedule.departure_time)}`
}

function formatBusRow(bus) {
  return {
    plate_number: bus.plate_Number,
    total_seats: bus.total_seat,
  }
}

function formatRouteRow(route) {
  return {
    source: route.source,
    destination: route.destination,
    price: route.price,
  }
}

function formatDriverRow(driver) {
  return {
    full_name: driver.full_name,
    email: driver.email,
    phone: driver.phone || '',
    role: driver.role,
  }
}

function formatScheduleRow(schedule) {
  return {
    route: `${schedule.source} to ${schedule.destination}`,
    bus: schedule.plate_Number,
    driver: schedule.driver_name || 'Not assigned',
    departure: formatDateTime(schedule.departure_time),
    arrival: formatDateTime(schedule.arrival_time),
    price: schedule.price,
    available_seats: schedule.available_seats,
  }
}

function formatDriverScheduleRow(schedule) {
  return {
    route: `${schedule.source} to ${schedule.destination}`,
    bus: schedule.plate_Number,
    departure: formatDateTime(schedule.departure_time),
    customers: schedule.customers_count,
    available_seats: schedule.available_seats,
  }
}

function formatTicketRow(ticket) {
  return {
    customer: ticket.customer_name,
    route: `${ticket.source} to ${ticket.destination}`,
    bus: ticket.plate_Number,
    seat: ticket.seat_number,
    departure: formatDateTime(ticket.departure_time),
    price: ticket.price,
  }
}

export default App
