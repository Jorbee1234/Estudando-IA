using api_notificacoes.Data;
using Microsoft.EntityFrameworkCore;

namespace api_notificacoes.Tests.Infra;

public static class ContextoDeTeste
{
    /// <summary>DbContext direto no banco de teste, sem passar pela API. Chame BancoDeTeste.Resetar() antes.</summary>
    public static NotificacoesDbContext Criar()
    {
        BancoDeTeste.Preparar();
        var opcoes = new DbContextOptionsBuilder<NotificacoesDbContext>()
            .UseNpgsql(BancoDeTeste.ConnectionString)
            .Options;
        return new NotificacoesDbContext(opcoes);
    }
}
