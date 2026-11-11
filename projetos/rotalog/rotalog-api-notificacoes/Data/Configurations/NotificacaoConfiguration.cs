using api_notificacoes.Domain;
using api_notificacoes.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api_notificacoes.Data.Configurations;

public class NotificacaoConfiguration : IEntityTypeConfiguration<Notificacao>
{
    public void Configure(EntityTypeBuilder<Notificacao> builder)
    {
        builder.ToTable("notificacoes");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(n => n.Tipo).HasColumnName("tipo").IsRequired().HasMaxLength(50);
        builder.Property(n => n.Canal).HasColumnName("canal").IsRequired().HasMaxLength(20);
        builder.Property(n => n.Destinatario).HasColumnName("destinatario").IsRequired().HasMaxLength(255);
        builder.Property(n => n.Assunto).HasColumnName("assunto").HasMaxLength(255);
        builder.Property(n => n.Mensagem).HasColumnName("mensagem").IsRequired();

        // Texto em maiúsculas no banco, enum no código
        builder.Property(n => n.Status).HasColumnName("status").IsRequired().HasMaxLength(20)
            .HasConversion(s => s.ParaTexto(), t => StatusNotificacaoTexto.Ler(t));

        builder.Property(n => n.Tentativas).HasColumnName("tentativas");
        builder.Property(n => n.MaxTentativas).HasColumnName("max_tentativas");
        builder.Property(n => n.ErroMensagem).HasColumnName("erro_mensagem");
        builder.Property(n => n.ServicoOrigem).HasColumnName("servico_origem").HasMaxLength(50);
        builder.Property(n => n.ReferenciaId).HasColumnName("referencia_id").HasMaxLength(100);
        builder.Property(n => n.DataCriacao).HasColumnName("data_criacao");
        builder.Property(n => n.DataEnvio).HasColumnName("data_envio");
        builder.Property(n => n.DataAtualizacao).HasColumnName("data_atualizacao");

        // Mesmos nomes do SQL do workspace (04-migration-notificacoes.sql)
        builder.HasIndex(n => n.Status).HasDatabaseName("idx_notificacoes_status");
        builder.HasIndex(n => n.Tipo).HasDatabaseName("idx_notificacoes_tipo");
        builder.HasIndex(n => n.Destinatario).HasDatabaseName("idx_notificacoes_destinatario");
        builder.HasIndex(n => n.DataCriacao).HasDatabaseName("idx_notificacoes_data_criacao");
    }
}
