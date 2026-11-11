import estilos from './skeleton.module.css';

/**
 * Esqueleto do resultado enquanto o pedido é buscado. Os blocos são decorativos
 * (`aria-hidden`); o anúncio fica no texto com `role="status"`.
 */
export function ResultadoSkeleton() {
  return (
    <section className={estilos.cartao} aria-busy="true" aria-label="Carregando pedido">
      <p className={estilos.texto} role="status">
        Buscando pedido...
      </p>
      <div aria-hidden="true">
        <div className={`${estilos.bloco} ${estilos.titulo}`} />
        <div className={`${estilos.bloco} ${estilos.linha}`} />
        <div className={estilos.etapas}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${estilos.bloco} ${estilos.circulo}`} />
          ))}
        </div>
        <div className={`${estilos.bloco} ${estilos.painel}`} />
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${estilos.bloco} ${estilos.linha}`} />
        ))}
      </div>
    </section>
  );
}
