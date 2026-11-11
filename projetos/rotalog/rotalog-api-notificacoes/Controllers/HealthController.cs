using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace api_notificacoes.Controllers;

// Checa só o próprio banco. Disponibilidade da api-frotas e da api-entregas, se desejada,
// seria chamada HTTP aos respectivos /health (ADR 0001, D7).
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    public const string CheckBanco = "database";

    private static readonly string Versao = LerVersao();

    private readonly HealthCheckService _health;
    private readonly ILogger<HealthController> _logger;

    public HealthController(HealthCheckService health, ILogger<HealthController> logger)
    {
        _health = health;
        _logger = logger;
    }

    [HttpGet("/api/health")]
    public async Task<IActionResult> Health()
    {
        var relatorio = await _health.CheckHealthAsync(c => c.Name == CheckBanco);

        var banco = "DOWN";
        if (relatorio.Entries.TryGetValue(CheckBanco, out var entrada))
        {
            if (entrada.Status == HealthStatus.Healthy)
                banco = "UP";
            else
                _logger.LogError(entrada.Exception, "Database health check failed");
        }

        return Ok(new
        {
            service = "api-notificacoes",
            status = banco == "UP" ? "UP" : "DEGRADED",
            timestamp = DateTime.UtcNow,
            version = Versao,
            dependencies = new { database = banco }
        });
    }

    // "1.0.0+<hash do commit>" -> "1.0.0"
    private static string LerVersao()
    {
        var assembly = typeof(HealthController).Assembly;
        var informacional = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        return informacional?.Split('+')[0] ?? assembly.GetName().Version?.ToString(3) ?? "desconhecida";
    }
}
