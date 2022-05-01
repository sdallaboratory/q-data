export function log(type: 'HTTP' | 'WebSocket' | 'System', text: string, id: string = 'unknown') {
    const typeConstWidth = type + ' '.repeat(9).slice(type.length);
    console.log(new Date().toLocaleString(), '|', typeConstWidth, `(${id})`, ':', text)
}