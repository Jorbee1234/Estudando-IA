import { readFileSync } from 'fs';
import { join } from 'path';

// Garante o contraste WCAG 2.1 AA dos tokens (ADR 0001, D4/D6): texto >= 4,5:1
// e componentes (bordas de campo, foco) >= 3:1, nos temas claro e escuro.

type Tokens = Record<string, string>;

const css = readFileSync(join(__dirname, '_tokens.css'), 'utf8');

function variaveis(bloco: string): Tokens {
  const out: Tokens = {};
  for (const m of bloco.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function corpoDe(seletor: string): string {
  const i = css.indexOf(seletor);
  if (i < 0) throw new Error('bloco não encontrado: ' + seletor);
  let nivel = 0;
  for (let j = css.indexOf('{', i); j < css.length; j++) {
    if (css[j] === '{') nivel++;
    if (css[j] === '}' && --nivel === 0) return css.slice(i, j);
  }
  throw new Error('bloco aberto: ' + seletor);
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const claro = variaveis(corpoDe(':root {'));
const escuro = { ...claro, ...variaveis(corpoDe(":root[data-theme='dark']")) };

// [texto, fundo, mínimo]
const pares = (t: Tokens, corTextoPerigo: string): [string, string, number][] => [
  [t['--cor-texto'], t['--cor-superficie'], 4.5],
  [t['--cor-texto'], t['--cor-fundo'], 4.5],
  [t['--cor-texto-suave'], t['--cor-superficie'], 4.5],
  [t['--cor-texto-suave'], t['--cor-superficie-alt'], 4.5],
  [t['--cor-texto-mudo'], t['--cor-superficie'], 4.5],
  [t['--cor-texto-mudo'], t['--cor-fundo'], 4.5],
  [t['--cor-primaria-texto'], t['--cor-primaria'], 4.5],
  [t['--cor-primaria-texto'], t['--cor-primaria-hover'], 4.5],
  [t['--cor-link'], t['--cor-superficie'], 4.5],
  [t['--cor-link'], t['--cor-fundo'], 4.5],
  [t['--cor-link'], t['--cor-primaria-suave'], 4.5],
  [corTextoPerigo, t['--cor-perigo'], 4.5],
  [corTextoPerigo, t['--cor-perigo-hover'], 4.5],
  [t['--cor-sidebar-texto'], t['--cor-sidebar'], 4.5],
  [t['--cor-sidebar-mudo'], t['--cor-sidebar'], 4.5],
  [t['--cor-sidebar-destaque'], t['--cor-sidebar-ativo'], 4.5],
  [t['--cor-sidebar-texto'], t['--cor-sidebar-hover'], 4.5],
  ...(['sucesso', 'alerta', 'perigo', 'info', 'neutro'] as const).map(
    (tom): [string, string, number] => [
      t[`--tom-${tom}-texto`],
      t[`--tom-${tom}-fundo`],
      4.5,
    ]
  ),
  // Componentes de interface: >= 3:1
  [t['--cor-borda-forte'], t['--cor-superficie'], 3],
  [t['--cor-foco'], t['--cor-superficie'], 3],
  [t['--cor-foco'], t['--cor-fundo'], 3],
];

describe.each([
  ['claro', claro, '#ffffff'],
  ['escuro', escuro, escuro['--cor-primaria-texto']],
] as const)('contraste dos tokens (tema %s)', (_nome, tokens, textoPerigo) => {
  it.each(pares(tokens, textoPerigo))(
    '%s sobre %s >= %s:1',
    (texto, fundo, minimo) => {
      expect(texto).toBeDefined();
      expect(fundo).toBeDefined();
      expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(minimo);
    }
  );
});

describe('tema escuro automático', () => {
  it('repete os mesmos valores do tema escuro forçado', () => {
    const auto = variaveis(corpoDe(':root:not([data-theme=\'light\'])'));
    const forcado = variaveis(corpoDe(":root[data-theme='dark']"));
    expect(auto).toEqual(forcado);
  });
});

// ---- ADR 0003, fase 2: paleta de gráficos, elevação, movimento e densidade ----

/** Todas as declarações do bloco, qualquer valor (não só cores hex). */
function declaracoes(bloco: string): Tokens {
  const out: Tokens = {};
  for (const m of bloco.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const todosClaro = declaracoes(corpoDe(':root {'));
const todosEscuro = { ...todosClaro, ...declaracoes(corpoDe(":root[data-theme='dark']")) };

const SERIES = [1, 2, 3, 4, 5, 6].map((n) => `--grafico-${n}`);

// Matrizes de Machado et al. (2009), severidade 1, aplicadas em RGB linear.
const VISOES: Record<string, number[][]> = {
  normal: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

function paraLab(hex: string, visao: string): number[] {
  const lin = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  const [r, g, b] = VISOES[visao].map((l) =>
    Math.min(1, Math.max(0, l[0] * lin[0] + l[1] * lin[1] + l[2] * lin[2]))
  );
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const deltaE = (a: string, b: string, visao: string) => {
  const [p, q] = [paraLab(a, visao), paraLab(b, visao)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

describe.each([
  ['claro', claro],
  ['escuro', escuro],
] as const)('paleta de gráficos (tema %s)', (_nome, t) => {
  it('tem as 6 séries', () => {
    for (const s of SERIES) expect(t[s]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(SERIES)('%s tem >= 3:1 contra a superfície e o fundo (elemento gráfico, WCAG 1.4.11)', (serie) => {
    expect(contraste(t[serie], t['--cor-superficie'])).toBeGreaterThanOrEqual(3);
    expect(contraste(t[serie], t['--cor-fundo'])).toBeGreaterThanOrEqual(3);
  });

  it.each(Object.keys(VISOES))('qualquer par de séries se distingue na visão %s (ΔE >= 15)', (visao) => {
    for (let i = 0; i < SERIES.length; i++) {
      for (let j = i + 1; j < SERIES.length; j++) {
        const de = deltaE(t[SERIES[i]], t[SERIES[j]], visao);
        expect({ par: `${SERIES[i]}/${SERIES[j]}`, ok: de >= 15 }).toEqual({ par: `${SERIES[i]}/${SERIES[j]}`, ok: true });
      }
    }
  });
});

describe('elevação, movimento e densidade', () => {
  it.each([['claro', todosClaro], ['escuro', todosEscuro]] as const)(
    'escala de elevação 1 a 3 existe no tema %s e os apelidos antigos apontam para ela',
    (_n, t) => {
      for (const n of [1, 2, 3]) expect(t[`--elev-${n}`]).toBeDefined();
      expect(t['--sombra-card']).toBe('var(--elev-1)');
      expect(t['--sombra-alta']).toBe('var(--elev-3)');
    }
  );

  it('o escuro redefine as 3 elevações (sombra clara some sobre fundo escuro)', () => {
    for (const n of [1, 2, 3]) expect(todosEscuro[`--elev-${n}`]).not.toBe(todosClaro[`--elev-${n}`]);
  });

  it('prefers-reduced-motion zera as durações', () => {
    const base = readFileSync(join(__dirname, 'base.css'), 'utf8');
    const inicio = base.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(inicio).toBeGreaterThan(-1);
    const bloco = base.slice(inicio);
    expect(bloco).toMatch(/--duracao-curta:\s*0s/);
    expect(bloco).toMatch(/--duracao-media:\s*0s/);
  });

  it('a transição padrão usa os tokens de movimento', () => {
    expect(todosClaro['--transicao']).toBe('var(--duracao-curta) var(--easing)');
  });

  it('densidade confortável é o padrão e mantém as medidas anteriores', () => {
    expect(todosClaro['--densidade']).toBe('1');
    expect(todosClaro['--tabela-celula-y']).toBe('calc(0.875rem * var(--densidade))');
    expect(todosClaro['--tabela-celula-x']).toBe('calc(1rem * var(--densidade))');
  });

  it('a densidade compacta reduz o espaço mas o alvo de clique fica >= 24px (WCAG 2.2)', () => {
    const compacta = declaracoes(corpoDe(":root[data-densidade='compacta']"));
    const d = parseFloat(compacta['--densidade']);
    expect(d).toBeLessThan(1);
    expect(d).toBeGreaterThan(0);
    const piso = /max\(\s*([\d.]+)rem/.exec(todosClaro['--alvo-minimo']);
    const alvoPx = Math.max(parseFloat(piso?.[1] ?? '0'), 2.75 * d) * 16;
    expect(alvoPx).toBeGreaterThanOrEqual(24);
    expect(alvoPx).toBeLessThan(2.75 * 16);
  });

  it('o tema escuro automático repete todos os tokens do forçado (não só as cores)', () => {
    const auto = declaracoes(corpoDe(":root:not([data-theme='light'])"));
    const forcado = declaracoes(corpoDe(":root[data-theme='dark']"));
    expect(auto).toEqual(forcado);
  });
});
