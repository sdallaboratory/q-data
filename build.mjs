import { spawn } from "child_process";

function run(command, stdio = true) {
    const [exe, ...args] = command.split(/\s+/g);
    return new Promise((resolve, reject) => {
        console.log('RUN', command);
        const childProcess = spawn(exe, args, { stdio: stdio ? 'inherit' : 'ignore' });
        childProcess.on('exit', (code) => {
            if(code === 0) {
                resolve(code)
                console.log('SUCCESS', command);
            } else {
                reject(new Error(code));
                console.log('ERROR', command);
            }
        });
    });
}

async function main() {
    const exe = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';
    await Promise.all([
        run(`${exe} run build --prefix web-client`, false),
        run(`${exe} run build --prefix worker`, false),
        run(`${exe} run build --prefix browser-worker`, false),
        run(`${exe} run build --prefix browser-workers-manager`, false),
        run(`${exe} run build --prefix arena`, false),
        run(`${exe} run build --prefix orchestrator`, false),
    ])
    // await run('docker compose down --rmi local --remove-orphans');
    // await run('docker system prune -f');
    // await run('docker compose build --no-cache');
    // await run('docker compose up');
}

main();
