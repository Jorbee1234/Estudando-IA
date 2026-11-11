using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace api_notificacoes.Tests.Infra;

public class ApiFactory : WebApplicationFactory<Program>
{
    public ApiFactory()
    {
        BancoDeTeste.Preparar();
        // Variável de ambiente é lida pelo builder do Program antes de qualquer ConfigureWebHost (.NET 6 minimal hosting).
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", BancoDeTeste.ConnectionString);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Os testes não dependem dos valores do appsettings.json local (que sai do git na fase 6).
        // O limite de requisições é alto para não interferir; o teste de rate limit usa um limite próprio.
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["EmailSettings:SmtpServer"] = "smtp.teste.local",
            ["EmailSettings:SmtpPort"] = "587",
            ["EmailSettings:SenderEmail"] = "noreply@teste.local",
            ["SmsSettings:ApiUrl"] = "https://sms.teste.local/send",
            ["RateLimit:Limite"] = "100000",
            // o seed tem uma PENDENTE sem tentativas; a recuperação na subida mexeria nela durante os testes
            ["Envio:RecuperarPendentesNaInicializacao"] = "false"
        }));
    }
}

[CollectionDefinition("api")]
public class ApiCollection : ICollectionFixture<ApiFactory> { }

/// <summary>Base: um banco limpo (seed 07) por teste. A coleção "api" roda em série.</summary>
[Collection("api")]
public abstract class TesteDeApi : IDisposable
{
    protected readonly HttpClient Http;

    protected TesteDeApi(ApiFactory factory)
    {
        Espera.FilaVazia(factory.Services);
        BancoDeTeste.Resetar();
        Http = factory.CreateClient();
    }

    public void Dispose() => Http.Dispose();
}
