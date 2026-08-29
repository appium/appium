import {log} from '../logger.js';

log.info('Successfully ran the script');

log.info(process.argv.slice(2).join(' '));
