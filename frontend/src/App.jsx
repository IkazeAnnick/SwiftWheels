import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { api } from './api/api'
import {
  emptyBus,
  emptyDriver,
  emptyLogin,
  emptyPassword,
  emptyReportFilters,
  emptyRoute,
  emptySchedule,
  emptySearch,
  emptySignup,
  emptyTicket,
} from './data/emptyForms'
import AuthPage from './pages/AuthPage'
import CustomerDashboard from './pages/CustomerDashboard'
import DriverDashboard from './pages/DriverDashboard'
import FleetManagerDashboard from './pages/FleetManagerDashboard'
import {
  dashboardTitle,
  escapeHtml,
  formatDateTime,
  getReportFilterSummary,
  toDatetimeLocal,
} from './utils/formatters'

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


export default App
