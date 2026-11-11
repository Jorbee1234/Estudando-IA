import type { Meta, StoryObj } from '@storybook/angular';

// Amostras dos tokens (ADR 0003, D1) para revisão visual. Use a barra de ferramentas para
// alternar o tema e a densidade: as amostras leem as variáveis CSS ao vivo.
const meta: Meta = {
  title: 'Design/Tokens',
  parameters: { layout: 'padded' },
};
export default meta;
type Story = StoryObj;

const caixa = 'display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:2rem';
const titulo = 'margin: 0 0 .75rem; font-size: var(--fs-md)';

export const PaletaDeGraficos: Story = {
  render: () => ({
    props: { series: [1, 2, 3, 4, 5, 6] },
    template: `
      <h3 style="${titulo}">Séries categóricas (--grafico-1 a 6)</h3>
      <div style="${caixa}">
        @for (n of series; track n) {
          <div style="width:7rem">
            <div [style.background]="'var(--grafico-' + n + ')'"
                 style="height:4rem; border-radius: var(--raio-md); border: 1px solid var(--cor-borda)"></div>
            <code style="font-size: var(--fs-xs)">--grafico-{{ n }}</code>
          </div>
        }
      </div>
      <p style="color: var(--cor-texto-suave); max-width: 40rem">
        Cada cor tem pelo menos 3:1 de contraste contra as superfícies e diferença ΔE ≥ 15 entre
        qualquer par, inclusive para protanopia, deuteranopia e tritanopia. Cor nunca é o único sinal.
      </p>
    `,
  }),
};

export const Elevacao: Story = {
  render: () => ({
    props: { niveis: [1, 2, 3] },
    template: `
      <h3 style="${titulo}">Elevação (--elev-1 a 3)</h3>
      <div style="${caixa}">
        @for (n of niveis; track n) {
          <div [style.box-shadow]="'var(--elev-' + n + ')'"
               style="width:10rem; height:6rem; display:grid; place-items:center;
                      background: var(--cor-superficie); border-radius: var(--raio-card)">
            --elev-{{ n }}
          </div>
        }
      </div>
    `,
  }),
};

export const Formas: Story = {
  render: () => ({
    props: { raios: ['sm', 'md', 'card', 'pill'] },
    template: `
      <h3 style="${titulo}">Raios</h3>
      <div style="${caixa}">
        @for (r of raios; track r) {
          <div [style.border-radius]="'var(--raio-' + r + ')'"
               style="width:8rem; height:4rem; display:grid; place-items:center;
                      background: var(--cor-primaria-suave); color: var(--cor-link);
                      border: 1px solid var(--cor-borda)">
            --raio-{{ r }}
          </div>
        }
      </div>
    `,
  }),
};

export const Movimento: Story = {
  render: () => ({
    styles: [
      `.demo-mov { transition: transform var(--duracao-media) var(--easing); }
       .demo-mov:hover, .demo-mov:focus-visible { transform: translateY(-4px); }`,
    ],
    template: `
      <h3 style="${titulo}">Movimento</h3>
      <p style="color: var(--cor-texto-suave); max-width: 40rem">
        Passe o mouse ou foque no botão: a transição usa <code>--duracao-curta</code> e
        <code>--easing</code>. Com <em>prefers-reduced-motion</em> as durações viram 0s.
      </p>
      <button class="btn btn--secondary demo-mov">Passe o mouse</button>
    `,
  }),
};
