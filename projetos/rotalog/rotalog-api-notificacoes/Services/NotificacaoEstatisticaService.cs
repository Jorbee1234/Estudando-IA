using api_notificacoes.Data;
using api_notificacoes.Domain;
using api_notificacoes.DTOs;
using Microsoft.EntityFrameworkCore;

namespace api_notificacoes.Services;

public interface INotificacaoEstatisticaService
{
    Task<NotificacaoStats> ObterAsync();
}

// Contagens no banco (GroupBy) em vez de carregar a tabela inteira
public class NotificacaoEstatisticaService : INotificacaoEstatisticaService
{
    private readonly NotificacoesDbContext _context;

    public NotificacaoEstatisticaService(NotificacoesDbContext context)
    {
        _context = context;
    }

    public async Task<NotificacaoStats> ObterAsync()
    {
        var porStatus = await _context.Notificacoes
            .GroupBy(n => n.Status)
            .Select(g => new { Status = g.Key, Total = g.Count() })
            .ToListAsync();

        var porTipo = await _context.Notificacoes
            .GroupBy(n => n.Tipo)
            .Select(g => new { g.Key, Total = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Total);

        var porCanal = await _context.Notificacoes
            .GroupBy(n => n.Canal)
            .Select(g => new { g.Key, Total = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Total);

        int Contar(StatusNotificacao status) => porStatus.FirstOrDefault(s => s.Status == status)?.Total ?? 0;

        return new NotificacaoStats
        {
            Total = porStatus.Sum(s => s.Total),
            Enviadas = Contar(StatusNotificacao.Enviado),
            Pendentes = Contar(StatusNotificacao.Pendente),
            Falhas = Contar(StatusNotificacao.Falha),
            PorTipo = porTipo,
            PorCanal = porCanal,
            GeradoEm = DateTime.UtcNow
        };
    }
}
