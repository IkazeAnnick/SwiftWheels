import { useState } from 'react'
import DataPanel from '../components/DataPanel'
import ManagerForm from '../components/ManagerForm'
import {
  formatBusRow,
  formatDateTime,
  formatDriverRow,
  formatRouteRow,
  formatScheduleOption,
  formatScheduleRow,
  formatTicketRow,
  getReportFilterSummary,
} from '../utils/formatters'

export default function FleetManagerDashboard(props) {
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


function rowActions(type, id, record, props) {
  return (
    <div className="row-actions">
      {type !== 'ticket' && <button type="button" onClick={() => props.startEdit(type, record)}>Edit</button>}
      <button type="button" onClick={() => props.deleteRecord(type, id)}>Delete</button>
    </div>
  )
}

