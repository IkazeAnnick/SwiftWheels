CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password VARCHAR(255) NOT NULL,
    role ENUM ('customer', 'driver', 'Fleet_Manager') DEFAULT 'customer'
);

CREATE TABLE buses (
    bus_id INT PRIMARY KEY AUTO_INCREMENT,
    plate_Number VARCHAR(100) NOT NULL UNIQUE,
    total_seat INT NOT NULL CHECK (total_seat > 0)
);

CREATE TABLE routes (
    r_id INT PRIMARY KEY AUTO_INCREMENT,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    price INT NOT NULL CHECK (price > 0),
    UNIQUE KEY unique_route (source, destination)
);

CREATE TABLE schedules (
    sch_id INT PRIMARY KEY AUTO_INCREMENT,
    bus_id INT NOT NULL,
    r_id INT NOT NULL,
    driver_id INT,
    departure_time DATETIME NOT NULL,
    UNIQUE KEY unique_bus_departure (bus_id, departure_time),
    FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (r_id) REFERENCES routes(r_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE ticket (
    ticket_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(100) NOT NULL,
    sch_id INT NOT NULL,
    seat_number INT NOT NULL,
    UNIQUE KEY unique_schedule_seat (sch_id, seat_number),
    FOREIGN KEY (sch_id) REFERENCES schedules(sch_id) ON DELETE CASCADE ON UPDATE CASCADE
);
