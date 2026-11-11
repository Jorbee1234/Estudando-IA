using api_notificacoes.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api_notificacoes.Data.Configurations;

public class TemplateNotificacaoConfiguration : IEntityTypeConfiguration<TemplateNotificacao>
{
    public void Configure(EntityTypeBuilder<TemplateNotificacao> builder)
    {
        builder.ToTable("templates_notificacao");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(t => t.Tipo).HasColumnName("tipo").IsRequired().HasMaxLength(50);
        builder.Property(t => t.Canal).HasColumnName("canal").IsRequired().HasMaxLength(20);
        builder.Property(t => t.AssuntoTemplate).HasColumnName("assunto_template").HasMaxLength(255);
        builder.Property(t => t.CorpoTemplate).HasColumnName("corpo_template").IsRequired();
        builder.Property(t => t.Ativo).HasColumnName("ativo");
        builder.Property(t => t.DataCriacao).HasColumnName("data_criacao");
        builder.Property(t => t.DataAtualizacao).HasColumnName("data_atualizacao");

        // No SQL o índice não é UNIQUE; a unicidade (tipo + canal) depende de mudar o 04 no workspace (ADR 0001, D2)
        builder.HasIndex(t => new { t.Tipo, t.Canal }).HasDatabaseName("idx_templates_tipo_canal");
    }
}
