const brcypt = require('bcryptjs');

const hash = brcypt.hashSync('manager123',10);
console.log(hash);

