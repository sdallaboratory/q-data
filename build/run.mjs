import { spawn } from "child_process";

export function run(command, stdio = true, cwd) {
    const log = status => console.log(status, command, 'IN', cwd ?? '.');
    const [exe, ...args] = command.split(/\s+/g);
    return new Promise((resolve, reject) => {
        log('RUN');
        const childProcess = spawn(exe, args, { stdio: stdio ? 'inherit' : 'ignore', cwd, });
        childProcess.on('exit', (code) => {
            if (code === 0) {
                resolve(code)
                log('SUCCESS');
            } else {
                reject(new Error(code));
                log('ERROR');
            }
        });
    });
}
