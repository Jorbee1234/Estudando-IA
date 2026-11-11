import type { Decorator, Preview } from '@storybook/angular';

/**
 * Aplica o tema como o ThemeService faz no app (data-theme no <html>) e a densidade
 * (data-densidade no <html>; os tokens de densidade só reagem ao elemento raiz).
 */
const comTema: Decorator = (story, contexto) => {
  const raiz = document.documentElement;
  raiz.setAttribute('data-theme', contexto.globals['tema'] === 'escuro' ? 'dark' : 'light');
  if (contexto.globals['densidade'] === 'compacta') raiz.setAttribute('data-densidade', 'compacta');
  else raiz.removeAttribute('data-densidade');
  return story();
};

const preview: Preview = {
  decorators: [comTema],
  globalTypes: {
    densidade: {
      description: 'Densidade das tabelas e dos botões',
      toolbar: {
        title: 'Densidade',
        icon: 'component',
        dynamicTitle: true,
        items: [
          { value: 'confortavel', title: 'Confortável' },
          { value: 'compacta', title: 'Compacta' },
        ],
      },
    },
    tema: {
      description: 'Tema do painel',
      toolbar: {
        title: 'Tema',
        icon: 'circlehollow',
        dynamicTitle: true,
        items: [
          { value: 'claro', title: 'Claro' },
          { value: 'escuro', title: 'Escuro' },
        ],
      },
    },
  },
  initialGlobals: { tema: 'claro', densidade: 'confortavel' },
  parameters: {
    // O fundo vem dos tokens (--cor-fundo), não do seletor padrão do Storybook.
    backgrounds: { disable: true },
    layout: 'padded',
    controls: { expanded: true },
  },
};

export default preview;
