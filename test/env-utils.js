import _ from 'lodash';

function cloneEnv() {
    let envBackup;
    beforeEach(() => { envBackup = process.env; process.env = _.cloneDeep(process.env); });
    afterEach(() => { process.env = envBackup; });
}

export { cloneEnv };

