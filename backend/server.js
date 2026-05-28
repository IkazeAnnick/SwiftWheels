const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const managerRole = 'Fleet_Manager';
const driverRole = 'driver';
const customerRole = 'customer';

app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(session({
    key: 'user_sid',
    secret: process.env.SESSION_SECRET || 'swiftwheels_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24,
        secure: false
    }
}));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

function asyncHandler(handler) {
    return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function buildReportFilters(query, scheduleAlias = 'schedules') {
    const where = [];
    const params = [];

    if (query.departure_date) {
        where.push(`DATE(${scheduleAlias}.departure_time) = ?`);
        params.push(query.departure_date);
    }

    if (query.r_id) {
        where.push(`${scheduleAlias}.r_id = ?`);
        params.push(query.r_id);
    }

    if (query.sch_id) {
        where.push(`${scheduleAlias}.sch_id = ?`);
        params.push(query.sch_id);
    }

    return {
        whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
        params
    };
}

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Please login first' });
    }

    next();
}

function requireManager(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Please login first' });
    }

    if (req.session.user.role !== managerRole) {
        return res.status(403).json({ message: 'Fleet manager access required' });
    }

    next();
}

function requireDriver(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Please login first' });
    }

    if (req.session.user.role !== driverRole) {
        return res.status(403).json({ message: 'Driver access required' });
    }

    next();
}

function requireCustomer(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Please login first' });
    }

    if (req.session.user.role !== customerRole) {
        return res.status(403).json({ message: 'Customer access required' });
    }

    next();
}

async function createDefaultManager() {
    const managerEmail = process.env.MANAGER_EMAIL || 'manager@swiftwheels.com';
    const managerName = process.env.MANAGER_NAME || 'Fleet Manager';
    const managerPassword = process.env.MANAGER_PASSWORD || 'manager123';

    const [existingManagers] = await db.query(
        'SELECT user_id FROM users WHERE role = ? LIMIT 1',
        [managerRole]
    );

    if (existingManagers.length > 0) {
        return;
    }

    const hashedPassword = await bcrypt.hash(managerPassword, 10);
    await db.query(
        'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
        [managerName, managerEmail, hashedPassword, managerRole]
    );
    console.log(`Default fleet manager created: ${managerEmail}`);
}

async function getScheduleDetails(scheduleId, connection = db) {
    const [schedules] = await connection.query(
        `
            SELECT
                schedules.sch_id,
                schedules.bus_id,
                schedules.r_id,
                schedules.driver_id,
                schedules.departure_time,
                buses.plate_Number,
                buses.total_seat,
                routes.source,
                routes.destination,
                routes.price,
                users.full_name AS driver_name,
                (buses.total_seat - COUNT(ticket.ticket_id)) AS available_seats
            FROM schedules
            JOIN buses ON schedules.bus_id = buses.bus_id
            JOIN routes ON schedules.r_id = routes.r_id
            LEFT JOIN users ON schedules.driver_id = users.user_id
            LEFT JOIN ticket ON schedules.sch_id = ticket.sch_id
            WHERE schedules.sch_id = ?
            GROUP BY schedules.sch_id
            LIMIT 1
        `,
        [scheduleId]
    );

    return schedules[0];
}

async function driverExists(driverId, connection = db) {
    if (!driverId) {
        return true;
    }

    const [drivers] = await connection.query(
        'SELECT user_id FROM users WHERE user_id = ? AND role = ? LIMIT 1',
        [driverId, driverRole]
    );

    return drivers.length > 0;
}

// Auth
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const [users] = await db.query(
        'SELECT user_id, full_name, email, password, role FROM users WHERE email = ? LIMIT 1',
        [email]
    );

    if (users.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.session.user = {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
    };

    return res.status(200).json({
        message: 'Login successful',
        user: req.session.user
    });
}));

app.post('/api/auth/signup', asyncHandler(async (req, res) => {
    const { full_name, email, phone = null, password } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
        'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        [full_name, email, phone, hashedPassword, customerRole]
    );

    req.session.user = {
        user_id: result.insertId,
        full_name,
        email,
        role: customerRole
    };

    return res.status(201).json({
        message: 'Account created successfully',
        user: req.session.user
    });
}));

app.get('/api/auth/me', requireLogin, (req, res) => {
    return res.status(200).json({ user: req.session.user });
});

app.post('/api/auth/logout', requireLogin, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to logout' });
        }

        res.clearCookie('user_sid');
        return res.status(200).json({ message: 'Logout successful' });
    });
});

app.put('/api/auth/change-password', requireLogin, asyncHandler(async (req, res) => {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
        return res.status(400).json({ message: 'Old password and new password are required' });
    }

    const [users] = await db.query(
        'SELECT password FROM users WHERE user_id = ? LIMIT 1',
        [req.session.user.user_id]
    );

    if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
    }

    const passwordMatches = await bcrypt.compare(old_password, users[0].password);
    if (!passwordMatches) {
        return res.status(401).json({ message: 'Old password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, req.session.user.user_id]);

    return res.status(200).json({ message: 'Password changed successfully' });
}));

// Fleet manager user creation. Customers register themselves; drivers are created here.
app.post('/api/users', requireManager, asyncHandler(async (req, res) => {
    const { full_name, email, phone = null, password, role = driverRole } = req.body;

    if (!full_name || !email || !password) {
        return res.status(400).json({ message: 'Full name, email, and password are required' });
    }

    if (![driverRole, managerRole].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
        'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
        [full_name, email, phone, hashedPassword, role]
    );

    return res.status(201).json({
        message: 'User created successfully',
        user_id: result.insertId
    });
}));

app.get('/api/users', requireManager, asyncHandler(async (req, res) => {
    const [users] = await db.query(
        'SELECT user_id, full_name, email, phone, role FROM users ORDER BY user_id DESC'
    );

    return res.status(200).json(users);
}));

app.get('/api/drivers', requireManager, asyncHandler(async (req, res) => {
    const [drivers] = await db.query(
        'SELECT user_id, full_name, email, phone, role FROM users WHERE role = ? ORDER BY user_id DESC',
        [driverRole]
    );

    return res.status(200).json(drivers);
}));

app.put('/api/users/:id', requireManager, asyncHandler(async (req, res) => {
    const { full_name, email, phone = null, password, role = driverRole } = req.body;

    if (!full_name || !email) {
        return res.status(400).json({ message: 'Full name and email are required' });
    }

    if (![driverRole, managerRole].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    const values = [full_name, email, phone, role];
    let sql = 'UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?';

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        sql += ', password = ?';
        values.push(hashedPassword);
    }

    sql += ' WHERE user_id = ?';
    values.push(req.params.id);

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User updated successfully' });
}));

app.delete('/api/users/:id', requireManager, asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.session.user.user_id) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const [result] = await db.query('DELETE FROM users WHERE user_id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
}));

// Buses
app.post('/api/buses', requireManager, asyncHandler(async (req, res) => {
    const { plate_Number, total_seat } = req.body;

    if (!plate_Number || !isPositiveInteger(total_seat)) {
        return res.status(400).json({ message: 'Plate number and total seats are required' });
    }

    const [result] = await db.query(
        'INSERT INTO buses (plate_Number, total_seat) VALUES (?, ?)',
        [plate_Number, Number(total_seat)]
    );

    return res.status(201).json({
        message: 'Bus registered successfully',
        bus_id: result.insertId
    });
}));

app.get('/api/buses', requireManager, asyncHandler(async (req, res) => {
    const [buses] = await db.query('SELECT * FROM buses ORDER BY bus_id DESC');
    return res.status(200).json(buses);
}));

app.put('/api/buses/:id', requireManager, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { plate_Number, total_seat } = req.body;

    if (!plate_Number || !isPositiveInteger(total_seat)) {
        return res.status(400).json({ message: 'Plate number and total seats are required' });
    }

    const [result] = await db.query(
        'UPDATE buses SET plate_Number = ?, total_seat = ? WHERE bus_id = ?',
        [plate_Number, Number(total_seat), id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Bus not found' });
    }

    return res.status(200).json({ message: 'Bus updated successfully' });
}));

app.delete('/api/buses/:id', requireManager, asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM buses WHERE bus_id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Bus not found' });
    }

    return res.status(200).json({ message: 'Bus deleted successfully' });
}));

// Routes
app.post('/api/routes', requireManager, asyncHandler(async (req, res) => {
    const { source, destination, price } = req.body;

    if (!source || !destination || !isPositiveInteger(price)) {
        return res.status(400).json({ message: 'Source, destination, and price are required' });
    }

    const [result] = await db.query(
        'INSERT INTO routes (source, destination, price) VALUES (?, ?, ?)',
        [source, destination, Number(price)]
    );

    return res.status(201).json({
        message: 'Route created successfully',
        r_id: result.insertId
    });
}));

app.get('/api/routes', requireManager, asyncHandler(async (req, res) => {
    const [routes] = await db.query('SELECT * FROM routes ORDER BY source, destination');
    return res.status(200).json(routes);
}));

app.put('/api/routes/:id', requireManager, asyncHandler(async (req, res) => {
    const { source, destination, price } = req.body;

    if (!source || !destination || !isPositiveInteger(price)) {
        return res.status(400).json({ message: 'Source, destination, and price are required' });
    }

    const [result] = await db.query(
        'UPDATE routes SET source = ?, destination = ?, price = ? WHERE r_id = ?',
        [source, destination, Number(price), req.params.id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Route not found' });
    }

    return res.status(200).json({ message: 'Route updated successfully' });
}));

app.delete('/api/routes/:id', requireManager, asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM routes WHERE r_id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Route not found' });
    }

    return res.status(200).json({ message: 'Route deleted successfully' });
}));

// Schedules map buses to routes at a departure date and time.
app.post('/api/schedules', requireManager, asyncHandler(async (req, res) => {
    const { bus_id, r_id, driver_id = null, departure_time } = req.body;

    if (!isPositiveInteger(bus_id) || !isPositiveInteger(r_id) || !departure_time) {
        return res.status(400).json({ message: 'Bus, route, and departure time are required' });
    }

    if (driver_id && !(await driverExists(driver_id))) {
        return res.status(400).json({ message: 'Selected driver does not exist' });
    }

    const [result] = await db.query(
        'INSERT INTO schedules (bus_id, r_id, driver_id, departure_time) VALUES (?, ?, ?, ?)',
        [bus_id, r_id, driver_id || null, departure_time]
    );

    return res.status(201).json({
        message: 'Schedule created successfully',
        sch_id: result.insertId
    });
}));

app.get('/api/schedules', requireManager, asyncHandler(async (req, res) => {
    const { source, destination, departure_date } = req.query;
    const where = [];
    const params = [];

    if (source) {
        where.push('routes.source = ?');
        params.push(source);
    }

    if (destination) {
        where.push('routes.destination = ?');
        params.push(destination);
    }

    if (departure_date) {
        where.push('DATE(schedules.departure_time) = ?');
        params.push(departure_date);
    }

    const [schedules] = await db.query(
        `
            SELECT
                schedules.sch_id,
                schedules.bus_id,
                schedules.r_id,
                schedules.driver_id,
                schedules.departure_time,
                buses.plate_Number,
                buses.total_seat,
                routes.source,
                routes.destination,
                routes.price,
                users.full_name AS driver_name,
                (buses.total_seat - COUNT(ticket.ticket_id)) AS available_seats
            FROM schedules
            JOIN buses ON schedules.bus_id = buses.bus_id
            JOIN routes ON schedules.r_id = routes.r_id
            LEFT JOIN users ON schedules.driver_id = users.user_id
            LEFT JOIN ticket ON schedules.sch_id = ticket.sch_id
            ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
            GROUP BY schedules.sch_id
            ORDER BY schedules.departure_time ASC
        `,
        params
    );

    return res.status(200).json(schedules);
}));

app.get('/api/search', requireCustomer, asyncHandler(async (req, res) => {
    const { source, destination, departure_date } = req.query;

    if (!source || !destination || !departure_date) {
        return res.status(400).json({
            message: 'Source, destination, and departure date are required'
        });
    }

    const [schedules] = await db.query(
        `
            SELECT
                schedules.sch_id,
                schedules.departure_time,
                schedules.driver_id,
                buses.bus_id,
                buses.plate_Number,
                buses.total_seat,
                routes.r_id,
                routes.source,
                routes.destination,
                routes.price,
                users.full_name AS driver_name,
                (buses.total_seat - COUNT(ticket.ticket_id)) AS available_seats
            FROM schedules
            JOIN buses ON schedules.bus_id = buses.bus_id
            JOIN routes ON schedules.r_id = routes.r_id
            LEFT JOIN users ON schedules.driver_id = users.user_id
            LEFT JOIN ticket ON schedules.sch_id = ticket.sch_id
            WHERE LOWER(routes.source) = LOWER(?)
                AND LOWER(routes.destination) = LOWER(?)
                AND DATE(schedules.departure_time) = ?
            GROUP BY schedules.sch_id
            HAVING available_seats > 0
            ORDER BY schedules.departure_time ASC
        `,
        [source, destination, departure_date]
    );

    return res.status(200).json(schedules);
}));

app.put('/api/schedules/:id', requireManager, asyncHandler(async (req, res) => {
    const { bus_id, r_id, driver_id = null, departure_time } = req.body;

    if (!isPositiveInteger(bus_id) || !isPositiveInteger(r_id) || !departure_time) {
        return res.status(400).json({ message: 'Bus, route, and departure time are required' });
    }

    if (driver_id && !(await driverExists(driver_id))) {
        return res.status(400).json({ message: 'Selected driver does not exist' });
    }

    const [result] = await db.query(
        'UPDATE schedules SET bus_id = ?, r_id = ?, driver_id = ?, departure_time = ? WHERE sch_id = ?',
        [bus_id, r_id, driver_id || null, departure_time, req.params.id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Schedule not found' });
    }

    return res.status(200).json({ message: 'Schedule updated successfully' });
}));

app.delete('/api/schedules/:id', requireManager, asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM schedules WHERE sch_id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Schedule not found' });
    }

    return res.status(200).json({ message: 'Schedule deleted successfully' });
}));

app.get('/api/schedules/:id/seats', requireCustomer, asyncHandler(async (req, res) => {
    const schedule = await getScheduleDetails(req.params.id);

    if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found' });
    }

    const [reservedSeats] = await db.query(
        'SELECT seat_number FROM ticket WHERE sch_id = ? ORDER BY seat_number ASC',
        [req.params.id]
    );
    const reserved = reservedSeats.map((seat) => seat.seat_number);
    const available = [];

    for (let seatNumber = 1; seatNumber <= schedule.total_seat; seatNumber += 1) {
        if (!reserved.includes(seatNumber)) {
            available.push(seatNumber);
        }
    }

    return res.status(200).json({
        sch_id: schedule.sch_id,
        total_seat: schedule.total_seat,
        reserved,
        available
    });
}));

// Tickets
app.post('/api/tickets', requireCustomer, asyncHandler(async (req, res) => {
    const { customer_name, sch_id, seat_number } = req.body;

    if (!customer_name || !isPositiveInteger(sch_id) || !isPositiveInteger(seat_number)) {
        return res.status(400).json({ message: 'Customer name, schedule, and seat number are required' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const schedule = await getScheduleDetails(sch_id, connection);

        if (!schedule) {
            await connection.rollback();
            return res.status(404).json({ message: 'Schedule not found' });
        }

        if (Number(seat_number) > schedule.total_seat) {
            await connection.rollback();
            return res.status(400).json({ message: 'Seat number is outside this bus capacity' });
        }

        const [existingTickets] = await connection.query(
            'SELECT ticket_id FROM ticket WHERE sch_id = ? AND seat_number = ? FOR UPDATE',
            [sch_id, seat_number]
        );

        if (existingTickets.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Seat is already reserved' });
        }

        const [result] = await connection.query(
            'INSERT INTO ticket (customer_name, sch_id, seat_number) VALUES (?, ?, ?)',
            [customer_name, sch_id, Number(seat_number)]
        );
        await connection.commit();

        return res.status(201).json({
            message: 'Ticket reserved successfully',
            ticket: {
                ticket_id: result.insertId,
                customer_name,
                sch_id: schedule.sch_id,
                seat_number: Number(seat_number),
                source: schedule.source,
                destination: schedule.destination,
                departure_time: schedule.departure_time,
                plate_Number: schedule.plate_Number,
                price: schedule.price
            }
        });
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}));

app.get('/api/tickets', requireManager, asyncHandler(async (req, res) => {
    const { whereSql, params } = buildReportFilters(req.query);
    const [tickets] = await db.query(
        `
            SELECT
                ticket.ticket_id,
                ticket.customer_name,
                ticket.seat_number,
                schedules.sch_id,
                schedules.departure_time,
                buses.plate_Number,
                routes.source,
                routes.destination,
                routes.price
            FROM ticket
            JOIN schedules ON ticket.sch_id = schedules.sch_id
            JOIN buses ON schedules.bus_id = buses.bus_id
            JOIN routes ON schedules.r_id = routes.r_id
            ${whereSql}
            ORDER BY ticket.ticket_id DESC
        `,
        params
    );

    return res.status(200).json(tickets);
}));

app.get('/api/tickets/:id', requireManager, asyncHandler(async (req, res) => {
    const [tickets] = await db.query(
        `
            SELECT
                ticket.ticket_id,
                ticket.customer_name,
                ticket.seat_number,
                schedules.sch_id,
                schedules.departure_time,
                buses.plate_Number,
                routes.source,
                routes.destination,
                routes.price
            FROM ticket
            JOIN schedules ON ticket.sch_id = schedules.sch_id
            JOIN buses ON schedules.bus_id = buses.bus_id
            JOIN routes ON schedules.r_id = routes.r_id
            WHERE ticket.ticket_id = ?
            LIMIT 1
        `,
        [req.params.id]
    );

    if (tickets.length === 0) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    return res.status(200).json(tickets[0]);
}));

app.put('/api/tickets/:id', requireManager, asyncHandler(async (req, res) => {
    const { customer_name, sch_id, seat_number } = req.body;

    if (!customer_name || !isPositiveInteger(sch_id) || !isPositiveInteger(seat_number)) {
        return res.status(400).json({ message: 'Customer name, schedule, and seat number are required' });
    }

    const [result] = await db.query(
        'UPDATE ticket SET customer_name = ?, sch_id = ?, seat_number = ? WHERE ticket_id = ?',
        [customer_name, sch_id, seat_number, req.params.id]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    return res.status(200).json({ message: 'Ticket updated successfully' });
}));

app.delete('/api/tickets/:id', requireManager, asyncHandler(async (req, res) => {
    const [result] = await db.query('DELETE FROM ticket WHERE ticket_id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Ticket not found' });
    }

    return res.status(200).json({ message: 'Ticket deleted successfully' });
}));

app.get('/api/reports/summary', requireManager, asyncHandler(async (req, res) => {
    const { whereSql, params } = buildReportFilters(req.query);
    const hasFilters = params.length > 0;

    const [[busCount]] = await db.query(
        hasFilters
            ? `
                SELECT COUNT(DISTINCT schedules.bus_id) AS total_buses
                FROM schedules
                ${whereSql}
            `
            : 'SELECT COUNT(*) AS total_buses FROM buses',
        params
    );
    const [[routeCount]] = await db.query(
        hasFilters
            ? `
                SELECT COUNT(DISTINCT schedules.r_id) AS total_routes
                FROM schedules
                ${whereSql}
            `
            : 'SELECT COUNT(*) AS total_routes FROM routes',
        params
    );
    const [[scheduleCount]] = await db.query(
        `
            SELECT COUNT(*) AS total_schedules
            FROM schedules
            ${whereSql}
        `,
        params
    );
    const [[ticketCount]] = await db.query(
        `
            SELECT COUNT(*) AS total_tickets
            FROM ticket
            JOIN schedules ON ticket.sch_id = schedules.sch_id
            ${whereSql}
        `,
        params
    );
    const [[driverCount]] = await db.query(
        hasFilters
            ? `
                SELECT COUNT(DISTINCT schedules.driver_id) AS total_drivers
                FROM schedules
                ${whereSql}
                    ${whereSql ? 'AND' : 'WHERE'} schedules.driver_id IS NOT NULL
            `
            : 'SELECT COUNT(*) AS total_drivers FROM users WHERE role = ?',
        hasFilters ? params : [driverRole]
    );
    const [[revenue]] = await db.query(`
        SELECT COALESCE(SUM(routes.price), 0) AS total_revenue
        FROM ticket
        JOIN schedules ON ticket.sch_id = schedules.sch_id
        JOIN routes ON schedules.r_id = routes.r_id
        ${whereSql}
    `, params);

    return res.status(200).json({
        ...busCount,
        ...routeCount,
        ...scheduleCount,
        ...ticketCount,
        ...driverCount,
        ...revenue
    });
}));

app.get('/api/driver/dashboard', requireDriver, asyncHandler(async (req, res) => {
    const [schedules] = await db.query(
        `
            SELECT
                schedules.sch_id,
                schedules.departure_time,
                buses.bus_id,
                buses.plate_Number,
                buses.total_seat,
                routes.r_id,
                routes.source,
                routes.destination,
                routes.price,
                COUNT(ticket.ticket_id) AS customers_count,
                (buses.total_seat - COUNT(ticket.ticket_id)) AS available_seats
            FROM schedules
            JOIN buses ON schedules.bus_id = buses.bus_id
            JOIN routes ON schedules.r_id = routes.r_id
            LEFT JOIN ticket ON schedules.sch_id = ticket.sch_id
            WHERE schedules.driver_id = ?
            GROUP BY schedules.sch_id
            ORDER BY schedules.departure_time ASC
        `,
        [req.session.user.user_id]
    );

    const totalCustomers = schedules.reduce((sum, schedule) => sum + Number(schedule.customers_count), 0);

    return res.status(200).json({
        driver: req.session.user,
        total_customers: totalCustomers,
        schedules
    });
}));

app.use((err, req, res, next) => {
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Duplicate record is not allowed' });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ message: 'Referenced bus, route, or schedule does not exist' });
    }

    console.error(err);
    return res.status(500).json({ message: 'Server error' });
});

async function startServer() {
    try {
        await db.query('SELECT 1');
        console.log('Connected to the database');
        await createDefaultManager();

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
}

startServer();
