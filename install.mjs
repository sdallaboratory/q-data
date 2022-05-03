import { run } from './build/run.mjs'

async function main() {
    const exe = /^win/.test(process.platform) ? 'yarn.cmd' : 'yarn';
    const command = `${exe} install --frozen-lockfile`;
    await run(command, true, './shared');
    await run(command, true, './web-client');
    await run(command, true, './worker');
    await run(command, true, './browser-worker');
    await run(command, true, './browser-workers-manager');
    await run(command, true, './arena');
    await run(command, true, './orchestrator');
}

main();
