import { BuscaPedido } from '../BuscaPedido/BuscaPedido';
import { Icon } from '../ui/icons/Icon';
import estilos from './TelaInicial.module.css';

/**
 * Entrada do portal: orienta o visitante e põe a busca em primeiro plano.
 * Os textos de orientação aguardam aprovação do produto (ADR 0004, D2).
 */
export function TelaInicial({ aoBuscar }: { aoBuscar: (numero: string) => void }) {
  return (
    <section className={estilos.tela} aria-labelledby="titulo-inicial">
      <div className={estilos.icone}>
        <Icon nome="pacote" tamanho={36} />
      </div>
      <h1 id="titulo-inicial" className={estilos.titulo}>
        Acompanhe sua entrega
      </h1>
      <p className={estilos.texto}>Digite o número do pedido para ver onde ele está e o histórico de movimentações.</p>
      <div className={estilos.busca}>
        <BuscaPedido variante="hero" aoBuscar={aoBuscar} />
      </div>
      <p className={estilos.dica}>O número do pedido está no e-mail ou SMS da sua compra. Exemplo: PED-001.</p>
    </section>
  );
}
