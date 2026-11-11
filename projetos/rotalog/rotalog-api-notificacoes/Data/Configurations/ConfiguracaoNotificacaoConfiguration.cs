using api_notificacoes.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace api_notificacoes.Data.Configurations;

public class ConfiguracaoNotificacaoConfiguration : IEntityTypeConfiguration<ConfiguracaoNotificacao>
{
    public void Configure(EntityTypeBuilder<ConfiguracaoNotificacao> builder)
    {
        builder.ToTable("configuracoes_notificacao");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id).HasColumnName("id").ValueGeneratedOnAdd();
        builder.Property(c => c.Destinatario).HasColumnName("destinatario").IsRequired().HasMaxLength(255);
        builder.Property(c => c.CanalPreferido).HasColumnName("canal_preferido").HasMaxLength(20);
        builder.Property(c => c.Ativo).HasColumnName("ativo");
        builder.Property(c => c.ReceberEmail).HasColumnName("receber_email");
        builder.Property(c => c.ReceberSms).HasColumnName("receber_sms");
        builder.Property(c => c.ReceberPush).HasColumnName("receber_push");
        builder.Property(c => c.HorarioSilenciosoInicio).HasColumnName("horario_silencioso_inicio");
        builder.Property(c => c.HorarioSilenciosoFim).HasColumnName("horario_silencioso_fim");
        builder.Property(c => c.DataCriacao).HasColumnName("data_criacao");
    }
}
