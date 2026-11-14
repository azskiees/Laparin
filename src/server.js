const { createApp } = require('./app');
const { createPool } = require('./db');

const port = Number(process.env.PORT || 3000);
createApp({ db: createPool() }).listen(port, '0.0.0.0', () => console.log(`Laparin berjalan di :${port}`));
