const fs = require('fs');
const path = require('path');

function listarJs(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) return listarJs(p);
        return p.endsWith('.js') ? [p] : [];
    });
}

test('src/ não usa console.* (usar utils/logger)', () => {
    const src = path.join(__dirname, '..', '..', 'src');
    const ofensores = listarJs(src).filter((f) => /\bconsole\./.test(fs.readFileSync(f, 'utf8')));
    expect(ofensores).toEqual([]);
});
