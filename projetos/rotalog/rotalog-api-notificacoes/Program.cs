// Dívidas conhecidas deste serviço: docs/adr/0001-reorganizacao-e-seguranca-api-notificacoes.md

using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using api_notificacoes.Canais;
using api_notificacoes.Configuration;
using api_notificacoes.Controllers;
using api_notificacoes.Data;
using api_notificacoes.Envio;
using api_notificacoes.Middleware;
using api_notificacoes.Services;
using api_notificacoes.Validators;
using FluentValidation;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Serilog;
using Serilog.Core;
using Serilog.Formatting.Compact;

const long LimiteCorpoEmBytes = 1_048_576;

var builder = WebApplication.CreateBuilder(args);

// Serilog: nível vem da configuração; JSON compacto fora de Development.
// Sinks registrados no DI (ILogEventSink) também recebem os eventos (usado pelos testes).
builder.Host.UseSerilog((contexto, servicos, log) =>
{
    log.ReadFrom.Configuration(contexto.Configuration).Enrich.FromLogContext();

    if (contexto.HostingEnvironment.IsDevelopment())
        log.WriteTo.Console();
    else
        log.WriteTo.Console(new CompactJsonFormatter());

    foreach (var sink in servicos.GetServices<ILogEventSink>())
        log.WriteTo.Sink(sink);
});

builder.WebHost.ConfigureKestrel(kestrel => kestrel.Limits.MaxRequestBodySize = LimiteCorpoEmBytes);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "RotaLog - API Notificações",
        Version = "v1",
        Description = "Microsserviço de notificações do sistema RotaLog"
    });
});

builder.Services.AddDbContext<NotificacoesDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions => npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "notificacoes")
    ));

builder.Services.AddHealthChecks()
    .AddDbContextCheck<NotificacoesDbContext>(HealthController.CheckBanco);

builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection(EmailOptions.Secao));
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection(SmsOptions.Secao));
builder.Services.Configure<NotificacaoOptions>(builder.Configuration.GetSection(NotificacaoOptions.Secao));
builder.Services.Configure<api_notificacoes.Configuration.CorsOptions>(builder.Configuration.GetSection(api_notificacoes.Configuration.CorsOptions.Secao));
builder.Services.Configure<RateLimitOptions>(builder.Configuration.GetSection(RateLimitOptions.Secao));

builder.Services.AddSingleton<IFalhaSimulada, FalhaSimuladaAleatoria>();
builder.Services.AddSingleton<ICanalNotificacao, EmailCanal>();
builder.Services.AddSingleton<ICanalNotificacao, SmsCanal>();
builder.Services.Configure<EnvioOptions>(builder.Configuration.GetSection(EnvioOptions.Secao));
builder.Services.AddSingleton<FilaEnvio>();
builder.Services.AddSingleton<IFilaEnvio>(sp => sp.GetRequiredService<FilaEnvio>());
builder.Services.AddHostedService<EnvioEmBackground>();
builder.Services.AddScoped<ITemplateRenderer, TemplateRenderer>();
builder.Services.AddScoped<INotificacaoProcessor, NotificacaoProcessor>();
builder.Services.AddScoped<INotificacaoEstatisticaService, NotificacaoEstatisticaService>();
builder.Services.AddScoped<INotificacaoService, NotificacaoService>();
builder.Services.AddScoped<IAlertaManutencaoService, AlertaManutencaoService>();
builder.Services.AddValidatorsFromAssemblyContaining<NotificacaoRequestValidator>();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// CORS: origens da configuração (padrão: os dois frontends locais). Configurado de forma tardia
// para que a configuração final, inclusive a dos testes, valha.
builder.Services.AddCors();
builder.Services.AddOptions<Microsoft.AspNetCore.Cors.Infrastructure.CorsOptions>()
    .Configure<IOptions<api_notificacoes.Configuration.CorsOptions>>((cors, minhas) =>
        cors.AddDefaultPolicy(policy => policy
            .WithOrigins(minhas.Value.OrigensEfetivas())
            .AllowAnyMethod()
            .AllowAnyHeader()));

// Rate limit por IP de origem nas rotas de escrita (atrás de proxy, vale o IP do proxy)
builder.Services.AddRateLimiter(_ => { });
builder.Services.AddOptions<RateLimiterOptions>()
    .Configure<IOptions<RateLimitOptions>>((limiter, config) =>
    {
        limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        limiter.AddPolicy(RateLimitOptions.PoliticaEscrita, contexto =>
            RateLimitPartition.GetFixedWindowLimiter(
                contexto.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = config.Value.Limite,
                    Window = TimeSpan.FromSeconds(config.Value.JanelaSegundos),
                    QueueLimit = 0
                }));
    });

var app = builder.Build();

// Sem banco não há serviço: falha na subida em vez de subir "de pé" e quebrar a primeira requisição.
// O schema vem dos scripts do rotalog-workspace; a API não cria tabelas.
using (var escopo = app.Services.CreateScope())
{
    var contexto = escopo.ServiceProvider.GetRequiredService<NotificacoesDbContext>();
    if (!await contexto.Database.CanConnectAsync())
    {
        app.Logger.LogCritical("Não foi possível conectar ao banco. Confira ConnectionStrings:DefaultConnection e se o PostgreSQL está no ar");
        throw new InvalidOperationException("Banco de dados indisponível na inicialização");
    }
}

app.UseExceptionHandler(_ => { });

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "API Notificações v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

app.Logger.LogInformation("API Notificações iniciada. Ambiente: {Environment}", app.Environment.EnvironmentName);

app.Run();

public partial class Program { }
