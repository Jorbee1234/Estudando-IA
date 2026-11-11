using api_notificacoes.Data;
using api_notificacoes.Domain;
using api_notificacoes.Envio;
using api_notificacoes.DTOs;
using api_notificacoes.Logging;
using api_notificacoes.Mapping;
using api_notificacoes.Models;
using api_notificacoes.Validators;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace api_notificacoes.Services;

public interface INotificacaoService
{
    Task<List<NotificacaoResponse>> ListarNotificacoes(
        string? tipo = null, string? status = null, string? canal = null, string? servicoOrigem = null);
    Task<NotificacaoResponse?> BuscarPorId(long id);
    Task<NotificacaoResponse> CriarNotificacao(NotificacaoRequest request);
    Task<NotificacaoResponse?> ReenviarNotificacao(long id, ReenvioRequest? request = null);
    Task<List<TemplateNotificacao>> ListarTemplates(bool? apenasAtivos = null);
}

// Criação, consulta, listagem e reenvio. O envio acontece depois, no EnvioEmBackground, via NotificacaoProcessor (ADR 0001, D1 e D4).
// Reenvio sem limite de tentativas e sem checar ENVIADO: ADR 0001, seção 2.
public class NotificacaoService : INotificacaoService
{
    private readonly NotificacoesDbContext _context;
    private readonly ILogger<NotificacaoService> _logger;
    private readonly ITemplateRenderer _templates;
    private readonly IFilaEnvio _fila;

    public NotificacaoService(
        NotificacoesDbContext context,
        ILogger<NotificacaoService> logger,
        ITemplateRenderer templates,
        IFilaEnvio fila)
    {
        _context = context;
        _logger = logger;
        _templates = templates;
        _fila = fila;
    }

    public async Task<List<NotificacaoResponse>> ListarNotificacoes(
        string? tipo = null, string? status = null, string? canal = null, string? servicoOrigem = null)
    {
        var query = _context.Notificacoes.AsQueryable();

        if (!string.IsNullOrEmpty(tipo))
            query = query.Where(n => n.Tipo == tipo);

        if (!string.IsNullOrEmpty(status))
        {
            // status desconhecido nunca casou com nada: lista vazia
            query = StatusNotificacaoTexto.TentarLer(status, out var statusFiltro)
                ? query.Where(n => n.Status == statusFiltro)
                : query.Where(_ => false);
        }

        if (!string.IsNullOrEmpty(canal))
            query = query.Where(n => n.Canal == canal.ToLower());

        if (!string.IsNullOrEmpty(servicoOrigem))
            query = query.Where(n => n.ServicoOrigem == servicoOrigem);

        var notificacoes = await query
            .OrderByDescending(n => n.DataCriacao)
            .ToListAsync();

        return notificacoes.Select(NotificacaoMapper.ParaResponse).ToList();
    }

    public async Task<NotificacaoResponse?> BuscarPorId(long id)
    {
        var notificacao = await _context.Notificacoes.FindAsync(id);
        return notificacao != null ? NotificacaoMapper.ParaResponse(notificacao) : null;
    }

    public async Task<NotificacaoResponse> CriarNotificacao(NotificacaoRequest request)
    {
        var canal = request.Canal ?? CanalNotificacao.Email;
        string? mensagemFinal = request.Mensagem;
        var assuntoFinal = request.Assunto;

        if (request.Variaveis != null && request.Variaveis.Count > 0)
        {
            var renderizado = await _templates.RenderizarAsync(request.Tipo, canal, request.Variaveis);
            if (renderizado != null)
            {
                mensagemFinal = renderizado.Mensagem;
                if (renderizado.Assunto != null)
                    assuntoFinal = renderizado.Assunto;
            }
        }

        // Template com corpo vazio cai na mensagem do request
        if (string.IsNullOrEmpty(mensagemFinal))
            mensagemFinal = request.Mensagem;

        var notificacao = new Notificacao
        {
            Tipo = request.Tipo,
            Canal = canal,
            Destinatario = request.Destinatario,
            Assunto = assuntoFinal,
            Mensagem = mensagemFinal ?? string.Empty,
            Status = StatusNotificacao.Pendente,
            ServicoOrigem = request.ServicoOrigem,
            ReferenciaId = request.ReferenciaId,
            DataCriacao = DateTime.UtcNow,
            DataAtualizacao = DateTime.UtcNow
        };

        _context.Notificacoes.Add(notificacao);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Notificação criada: {Id} - Tipo: {Tipo} - Canal: {Canal} - Destinatário: {Dest}",
            notificacao.Id, notificacao.Tipo, notificacao.Canal, Mascara.Destinatario(notificacao.Destinatario));

        Enfileirar(notificacao);

        return NotificacaoMapper.ParaResponse(notificacao);
    }

    public async Task<NotificacaoResponse?> ReenviarNotificacao(long id, ReenvioRequest? request = null)
    {
        var notificacao = await _context.Notificacoes.FindAsync(id);
        if (notificacao == null)
            return null;

        // Só um dos dois campos pode vir: o formato vale para o canal e o destinatário que ficarão
        var canalFinal = request?.NovoCanal ?? notificacao.Canal;
        var destinatarioFinal = request?.NovoDestinatario ?? notificacao.Destinatario;
        if ((request?.NovoCanal != null || request?.NovoDestinatario != null)
            && FormatoDestinatario.CanalConhecido(canalFinal)
            && !FormatoDestinatario.Valido(canalFinal, destinatarioFinal))
            throw new ValidationException(FormatoDestinatario.Mensagem(canalFinal));

        if (request?.NovoDestinatario != null)
            notificacao.Destinatario = request.NovoDestinatario;
        if (request?.NovoCanal != null)
            notificacao.Canal = request.NovoCanal;

        notificacao.Status = StatusNotificacao.Pendente;
        notificacao.ErroMensagem = null;
        notificacao.DataAtualizacao = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        Enfileirar(notificacao);

        return NotificacaoMapper.ParaResponse(notificacao);
    }

    // O envio sai da requisição: a resposta mostra a notificação aceita (PENDENTE) e o resultado aparece
    // no GET /{id}. Fila cheia não é erro: fica PENDENTE e /processar envia.
    private void Enfileirar(Notificacao notificacao)
    {
        if (!_fila.TentarEnfileirar(notificacao.Id, notificacao.Tentativas))
            _logger.LogWarning("Fila de envio cheia: notificação {Id} segue PENDENTE e será enviada por /processar", notificacao.Id);
    }

    public async Task<List<TemplateNotificacao>> ListarTemplates(bool? apenasAtivos = null)
    {
        var query = _context.Templates.AsQueryable();
        if (apenasAtivos == true)
            query = query.Where(t => t.Ativo);
        return await query.OrderBy(t => t.Tipo).ThenBy(t => t.Canal).ToListAsync();
    }
}
