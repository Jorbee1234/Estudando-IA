using api_notificacoes.DTOs;
using FluentValidation;

namespace api_notificacoes.Validators;

// O formato do destinatário quando só um dos dois campos vem é checado no serviço,
// que conhece o canal e o destinatário atuais da notificação.
public class ReenvioRequestValidator : AbstractValidator<ReenvioRequest>
{
    public ReenvioRequestValidator()
    {
        RuleFor(x => x.NovoCanal)
            .Must(FormatoDestinatario.CanalConhecido)
            .When(x => x.NovoCanal != null)
            .WithMessage("Campo 'novoCanal' deve ser 'email' ou 'sms'");

        RuleFor(x => x.NovoDestinatario)
            .Must(d => !string.IsNullOrWhiteSpace(d))
            .When(x => x.NovoDestinatario != null)
            .WithMessage("Campo 'novoDestinatario' não pode ser vazio");

        RuleFor(x => x.NovoDestinatario)
            .MaximumLength(NotificacaoRequestValidator.MaxDestinatario)
            .WithMessage($"Campo 'novoDestinatario' deve ter no máximo {NotificacaoRequestValidator.MaxDestinatario} caracteres");

        RuleFor(x => x.NovoDestinatario)
            .Must((x, d) => FormatoDestinatario.Valido(x.NovoCanal, d))
            .When(x => x.NovoCanal != null && FormatoDestinatario.CanalConhecido(x.NovoCanal)
                       && !string.IsNullOrWhiteSpace(x.NovoDestinatario)
                       && x.NovoDestinatario.Length <= NotificacaoRequestValidator.MaxDestinatario)
            .WithMessage(x => FormatoDestinatario.Mensagem(x.NovoCanal));
    }
}
