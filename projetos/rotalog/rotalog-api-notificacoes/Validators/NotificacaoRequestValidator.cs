using api_notificacoes.DTOs;
using FluentValidation;

namespace api_notificacoes.Validators;

// As três primeiras regras e mensagens são as de sempre (contrato com a api-frotas);
// as demais entram na fase 6 (ADR 0001, D3). Respostas continuam 400 com { error }.
public class NotificacaoRequestValidator : AbstractValidator<NotificacaoRequest>
{
    public const int MaxTipo = 50;
    public const int MaxDestinatario = 255;
    public const int MaxAssunto = 255;
    public const int MaxMensagem = 10_000;
    public const int MaxServicoOrigem = 50;
    public const int MaxReferenciaId = 100;
    public const int MaxVariaveis = 50;
    public const int MaxChaveVariavel = 100;
    public const int MaxValorVariavel = 1_000;

    public NotificacaoRequestValidator()
    {
        RuleFor(x => x.Tipo)
            .Must(tipo => !string.IsNullOrWhiteSpace(tipo))
            .WithMessage("Campo 'tipo' é obrigatório");

        RuleFor(x => x.Destinatario)
            .Must(destinatario => !string.IsNullOrWhiteSpace(destinatario))
            .WithMessage("Campo 'destinatario' é obrigatório");

        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Mensagem) || (x.Variaveis != null && x.Variaveis.Count > 0))
            .WithMessage("Campo 'mensagem' ou 'variaveis' é obrigatório");

        RuleFor(x => x.Canal)
            .Must(FormatoDestinatario.CanalConhecido)
            .When(x => x.Canal != null)
            .WithMessage("Campo 'canal' deve ser 'email' ou 'sms'");

        RuleFor(x => x.Tipo).MaximumLength(MaxTipo)
            .WithMessage($"Campo 'tipo' deve ter no máximo {MaxTipo} caracteres");

        RuleFor(x => x.Destinatario).MaximumLength(MaxDestinatario)
            .WithMessage($"Campo 'destinatario' deve ter no máximo {MaxDestinatario} caracteres");

        RuleFor(x => x.Destinatario)
            .Must((x, destinatario) => FormatoDestinatario.Valido(x.Canal, destinatario))
            .When(x => !string.IsNullOrWhiteSpace(x.Destinatario)
                       && x.Destinatario.Length <= MaxDestinatario
                       && (x.Canal == null || FormatoDestinatario.CanalConhecido(x.Canal)))
            .WithMessage(x => FormatoDestinatario.Mensagem(x.Canal));

        RuleFor(x => x.Assunto).MaximumLength(MaxAssunto)
            .WithMessage($"Campo 'assunto' deve ter no máximo {MaxAssunto} caracteres");

        RuleFor(x => x.Mensagem).MaximumLength(MaxMensagem)
            .WithMessage($"Campo 'mensagem' deve ter no máximo {MaxMensagem} caracteres");

        RuleFor(x => x.ServicoOrigem).MaximumLength(MaxServicoOrigem)
            .WithMessage($"Campo 'servicoOrigem' deve ter no máximo {MaxServicoOrigem} caracteres");

        RuleFor(x => x.ReferenciaId).MaximumLength(MaxReferenciaId)
            .WithMessage($"Campo 'referenciaId' deve ter no máximo {MaxReferenciaId} caracteres");

        RuleFor(x => x.Variaveis)
            .Must(v => v!.Count <= MaxVariaveis)
            .When(x => x.Variaveis != null)
            .WithMessage($"Campo 'variaveis' deve ter no máximo {MaxVariaveis} itens");

        RuleFor(x => x.Variaveis)
            .Must(v => v!.All(p => !string.IsNullOrWhiteSpace(p.Key) && p.Key.Length <= MaxChaveVariavel))
            .When(x => x.Variaveis != null)
            .WithMessage($"Chaves de 'variaveis' devem ser preenchidas e ter no máximo {MaxChaveVariavel} caracteres");

        RuleFor(x => x.Variaveis)
            .Must(v => v!.All(p => (p.Value?.Length ?? 0) <= MaxValorVariavel))
            .When(x => x.Variaveis != null)
            .WithMessage($"Valores de 'variaveis' devem ter no máximo {MaxValorVariavel} caracteres");
    }
}
