import { run } from './build/run.mjs'

async function main() {
    const exe = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    const command = `${exe} build`;
    await Promise.all([
        run(command, false, './web-client'),
        run(command, false, './worker'),
        run(command, false, './browser-worker'),
        run(command, false, './browser-workers-manager'),
        run(command, false, './bull-dashboard'),
        run(command, false, './orchestrator'),
    ])
}

main();
