
const config = require('config');

config.get('builds').forEach((build) => {
  require('./scripts/' + build)();
});
