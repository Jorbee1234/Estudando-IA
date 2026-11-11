## Definition of Done: Alerta de manutenção preventiva

### Criterios de aceite

- rotalog-api-frotas: endpoint que verifica veiculos com km > limite ou data > x meses
- rotalog-api-frotas: chamada http para o rotlalog-api-notificacao quando encontra veiculo elegivel
- rotalog-api-notificacao: endpoint que recebe pedido de alerta e envia email para o gestor
- rotalog-api-notificacao: retorna status de notificacao (enviado/falha)
- rotalog-api-frotas: registra alerta no banco com status da notificacao
- painel-admin: tela que lista alertas por filtro e por status
- teste unitários em cada serviço + teste end2end do fluxo completo
- comunicação: http sincrona entre servico
- tratamento de falha: se o rotalog-api-notificacao estiver fora, o alerta é registrado como status pendente