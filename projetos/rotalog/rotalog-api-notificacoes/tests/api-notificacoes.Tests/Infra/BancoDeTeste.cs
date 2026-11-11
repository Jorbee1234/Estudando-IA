using Microsoft.Extensions.Configuration;
using Npgsql;

namespace api_notificacoes.Tests.Infra;

/// <summary>
/// Banco PostgreSQL de teste (database rotalog_test no mesmo servidor do docker-compose).
/// O schema vem dos scripts do rotalog-workspace (fonte única, ADR 0001 D2); nada é criado pelo EF.
/// Sobrescreva com NOTIFICACOES_TEST_CONNECTION (e NOTIFICACOES_TEST_ADMIN_CONNECTION) se necessário.
/// </summary>
public static class BancoDeTeste
{
    private static readonly object Trava = new();
    private static bool _preparado;
    private static string _scripts = string.Empty;

    public static string ConnectionString { get; private set; } = string.Empty;

    public static void Preparar()
    {
        lock (Trava)
        {
            if (_preparado) return;

            var projetoApi = LocalizarAncestral("api-notificacoes.csproj");
            _scripts = Path.Combine(
                Directory.GetParent(projetoApi)!.FullName, "rotalog-workspace", "tools", "scripts");

            var padrao = new ConfigurationBuilder()
                .AddJsonFile(Path.Combine(projetoApi, "appsettings.json"))
                .Build()
                .GetConnectionString("DefaultConnection")!;

            ConnectionString = Environment.GetEnvironmentVariable("NOTIFICACOES_TEST_CONNECTION")
                ?? padrao.Replace("Database=rotalog;", "Database=rotalog_test;");
            var admin = Environment.GetEnvironmentVariable("NOTIFICACOES_TEST_ADMIN_CONNECTION")
                ?? padrao.Replace("Database=rotalog;", "Database=postgres;");

            CriarBancoSeNecessario(admin);

            foreach (var arquivo in new[] { "init-schemas.sql", "02-migration-frotas.sql",
                         "03-migration-entregas.sql", "04-migration-notificacoes.sql" })
                Executar(File.ReadAllText(Path.Combine(_scripts, arquivo)));

            _preparado = true;
        }
    }

    /// <summary>Limpa as tabelas do serviço e recarrega o seed (07) para cada teste.</summary>
    public static void Resetar()
    {
        Preparar();
        Executar("TRUNCATE notificacoes.notificacoes, notificacoes.templates_notificacao, " +
                 "notificacoes.configuracoes_notificacao RESTART IDENTITY;");
        Executar(File.ReadAllText(Path.Combine(_scripts, "07-seed-notificacoes.sql")));
    }

    public static void Executar(string sql)
    {
        using var conn = new NpgsqlConnection(ConnectionString);
        conn.Open();
        using var cmd = new NpgsqlCommand(sql, conn);
        cmd.ExecuteNonQuery();
    }

    public static T? Escalar<T>(string sql)
    {
        using var conn = new NpgsqlConnection(ConnectionString);
        conn.Open();
        using var cmd = new NpgsqlCommand(sql, conn);
        var r = cmd.ExecuteScalar();
        return r is null or DBNull ? default : (T)Convert.ChangeType(r, typeof(T));
    }

    private static void CriarBancoSeNecessario(string admin)
    {
        var nome = new NpgsqlConnectionStringBuilder(ConnectionString).Database!;
        using var conn = new NpgsqlConnection(admin);
        conn.Open();
        using var existe = new NpgsqlCommand("SELECT 1 FROM pg_database WHERE datname = @n", conn);
        existe.Parameters.AddWithValue("n", nome);
        if (existe.ExecuteScalar() is null)
        {
            using var cria = new NpgsqlCommand($"CREATE DATABASE \"{nome}\"", conn);
            cria.ExecuteNonQuery();
        }
    }

    public static string LocalizarProjetoApi() => LocalizarAncestral("api-notificacoes.csproj");

    private static string LocalizarAncestral(string arquivo)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (File.Exists(Path.Combine(dir.FullName, arquivo))) return dir.FullName;
            dir = dir.Parent;
        }
        throw new InvalidOperationException($"{arquivo} não encontrado acima de {AppContext.BaseDirectory}");
    }
}
