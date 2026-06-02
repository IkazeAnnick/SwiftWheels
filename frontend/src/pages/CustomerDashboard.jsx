import { formatDateTime, uniqueValues } from '../utils/formatters'

export default function CustomerDashboard(props) {
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

