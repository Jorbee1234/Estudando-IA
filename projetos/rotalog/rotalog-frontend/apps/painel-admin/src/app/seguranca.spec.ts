import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// ADR 0001, D5a/D8: falha se padrões inseguros voltarem a src/ (inclui templates, que o ESLint não cobre).
const raiz = join(__dirname, '..');

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|html)$/.test(nome) && !/\.spec\.ts$/.test(nome) ? [caminho] : [];
  });
}

const fontes = arquivos(raiz).map((caminho) => ({
  caminho: caminho.slice(raiz.length + 1).replaceAll('\\', '/'),
  texto: semComentarios(readFileSync(caminho, 'utf8')),
}));

/** Comentários podem citar os termos proibidos (ex.: "no lugar de alert()"). */
function semComentarios(texto: string): string {
  return texto
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const proibidos: Record<string, RegExp> = {
  'alert()': /(?<![\w.])(?:window\.)?alert\(/,
  'confirm()': /(?<![\w.])(?:window\.)?confirm\(/,
  innerHTML: /innerHTML/,
  'bypassSecurityTrust*': /bypassSecurityTrust/,
  'window.location': /window\.location/,
  'localhost fixo': /localhost/,
};

describe('padrões inseguros em src/', () => {
  for (const [nome, regex] of Object.entries(proibidos)) {
    it(`não usa ${nome}`, () => {
      const achados = fontes
        // environment.ts pode ter localhost; index.html tem a CSP de desenvolvimento.
        .filter((f) => !(nome === 'localhost fixo' && /environments\/|index\.html$/.test(f.caminho)))
        .filter((f) => regex.test(f.texto))
        .map((f) => f.caminho);
      expect(achados).toEqual([]);
    });
  }

  it('console.* só existe em core/logging/logger.ts', () => {
    const achados = fontes
      .filter((f) => /console\./.test(f.texto) && f.caminho !== 'app/core/logging/logger.ts')
      .map((f) => f.caminho);
    expect(achados).toEqual([]);
  });

  it('o index.html declara CSP restrita e idioma pt-BR', () => {
    const html = fontes.find((f) => f.caminho === 'index.html')?.texto ?? '';
    expect(html).toContain('lang="pt-BR"');
    expect(html).toMatch(/Content-Security-Policy/);
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("object-src 'none'");
    expect(html).not.toMatch(/script-src[^;"]*'unsafe-(inline|eval)'/);
  });
});
