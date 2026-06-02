export function dashboardTitle(role) {
  if (role === 'Fleet_Manager') return 'Fleet Manager Dashboard'
  if (role === 'driver') return 'Driver Dashboard'
  return 'Customer Dashboard'
}

export function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

export function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return offsetDate.toISOString().slice(0, 16)
}

export function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

export function getReportFilterSummary(filters, routes, schedules) {
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

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatScheduleOption(schedule) {
  return `${schedule.source} to ${schedule.destination} - ${formatDateTime(schedule.departure_time)}`
}

export function formatBusRow(bus) {
  return {
    plate_number: bus.plate_Number,
    total_seats: bus.total_seat,
  }
}

export function formatRouteRow(route) {
  return {
    source: route.source,
    destination: route.destination,
    price: route.price,
  }
}

export function formatDriverRow(driver) {
  return {
    full_name: driver.full_name,
    email: driver.email,
    phone: driver.phone || '',
    role: driver.role,
  }
}

export function formatScheduleRow(schedule) {
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

export function formatDriverScheduleRow(schedule) {
  return {
    route: `${schedule.source} to ${schedule.destination}`,
    bus: schedule.plate_Number,
    departure: formatDateTime(schedule.departure_time),
    customers: schedule.customers_count,
    available_seats: schedule.available_seats,
  }
}

export function formatTicketRow(ticket) {
  return {
    customer: ticket.customer_name,
    route: `${ticket.source} to ${ticket.destination}`,
    bus: ticket.plate_Number,
    seat: ticket.seat_number,
    departure: formatDateTime(ticket.departure_time),
    price: ticket.price,
  }
}

