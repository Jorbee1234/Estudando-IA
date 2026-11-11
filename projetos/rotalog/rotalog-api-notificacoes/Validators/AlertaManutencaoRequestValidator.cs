using System.Globalization;
using api_notificacoes.DTOs;
using FluentValidation;

namespace api_notificacoes.Validators;

// Respostas continuam 400 com { error }, como no POST /api/notificacoes
public class AlertaManutencaoRequestValidator : AbstractValidator<AlertaManutencaoRequest>
{
    public const int MaxPlaca = 20;
    public const int MaxModelo = 100;
    public const int MaxMotivo = 500;
    public const int MaxReferenciaId = 100;
    public const string FormatoData = "yyyy-MM-dd";

    public AlertaManutencaoRequestValidator()
    {
        RuleFor(x => x.Placa)
            .Must(p => !string.IsNullOrWhiteSpace(p))
            .WithMessage("Campo 'placa' é obrigatório");

        RuleFor(x => x.Motivo)
            .Must(m => !string.IsNullOrWhiteSpace(m))
            .WithMessage("Campo 'motivo' é obrigatório");

        RuleFor(x => x.Placa).MaximumLength(MaxPlaca)
            .WithMessage($"Campo 'placa' deve ter no máximo {MaxPlaca} caracteres");

        RuleFor(x => x.Modelo).MaximumLength(MaxModelo)
            .WithMessage($"Campo 'modelo' deve ter no máximo {MaxModelo} caracteres");

        RuleFor(x => x.Motivo).MaximumLength(MaxMotivo)
            .WithMessage($"Campo 'motivo' deve ter no máximo {MaxMotivo} caracteres");

        RuleFor(x => x.ReferenciaId).MaximumLength(MaxReferenciaId)
            .WithMessage($"Campo 'referenciaId' deve ter no máximo {MaxReferenciaId} caracteres");

        RuleFor(x => x.KmAtual).GreaterThanOrEqualTo(0)
            .WithMessage("Campo 'kmAtual' não pode ser negativo");

        RuleFor(x => x.KmBase!.Value).GreaterThanOrEqualTo(0)
            .When(x => x.KmBase != null)
            .WithMessage("Campo 'kmBase' não pode ser negativo");

        RuleFor(x => x.DataBase)
            .Must(d => DateTime.TryParseExact(d, FormatoData, CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            .When(x => !string.IsNullOrEmpty(x.DataBase))
            .WithMessage($"Campo 'dataBase' deve estar no formato {FormatoData}");
    }
}
