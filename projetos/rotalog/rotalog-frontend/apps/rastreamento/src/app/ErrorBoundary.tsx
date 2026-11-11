import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { StateMessage } from '../components/ui/StateMessage';
import { registrarErro } from './logger';

interface Props {
  /** Nome da região, usado na mensagem e no log. */
  regiao: string;
  children: ReactNode;
}

interface Estado {
  falhou: boolean;
}

/** Isola a falha de uma região (lista, dashboard, mapa) para não derrubar as outras. */
export class ErrorBoundary extends Component<Props, Estado> {
  override state: Estado = { falhou: false };

  static getDerivedStateFromError(): Estado {
    return { falhou: true };
  }

  override componentDidCatch(erro: Error, info: ErrorInfo) {
    registrarErro(`Falha na região ${this.props.regiao}`, erro, info.componentStack);
  }

  override render() {
    if (this.state.falhou) {
      return (
        <StateMessage
          tipo="erro"
          mensagem={`Não foi possível exibir ${this.props.regiao}.`}
          aoTentarNovamente={() => this.setState({ falhou: false })}
        />
      );
    }
    return this.props.children;
  }
}
