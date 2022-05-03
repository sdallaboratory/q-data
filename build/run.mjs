import { spawn } from "child_process";

export function run(command, stdio = true, cwd) {
    const [exe, ...args] = command.split(/\s+/g);
    return new Promise((resolve, reject) => {
        console.log('RUN', command);
        const childProcess = spawn(exe, args, { stdio: stdio ? 'inherit' : 'ignore', cwd });
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
