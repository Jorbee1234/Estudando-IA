using Microsoft.EntityFrameworkCore;
using api_notificacoes.Models;

namespace api_notificacoes.Data;

public class NotificacoesDbContext : DbContext
{
    public NotificacoesDbContext(DbContextOptions<NotificacoesDbContext> options)
        : base(options)
    {
    }

    public DbSet<Notificacao> Notificacoes { get; set; } = null!;
    public DbSet<TemplateNotificacao> Templates { get; set; } = null!;
    public DbSet<ConfiguracaoNotificacao> Configuracoes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Única declaração do schema; tabelas e colunas em Data/Configurations
        modelBuilder.HasDefaultSchema("notificacoes");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(NotificacoesDbContext).Assembly);
    }
}
