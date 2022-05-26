export function log(type: 'HTTP' | 'WebSocket' | 'System', text: string, id: string = 'unknown') {
    const typeConstWidth = type + ' '.repeat(9).slice(type.length);
    const message = [new Date().toLocaleString(), '|', typeConstWidth, `(${id})`, ':', text];
    console.log(...message)
    return message.join(' ');
}