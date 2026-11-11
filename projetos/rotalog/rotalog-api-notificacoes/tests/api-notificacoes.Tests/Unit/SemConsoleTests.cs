using System.Text.RegularExpressions;
using api_notificacoes.Tests.Infra;

namespace api_notificacoes.Tests.Unit;

/// <summary>Logs só via ILogger (ADR 0001, D5): falha se Console.Write* voltar ao código da API.</summary>
public class SemConsoleTests
{
    [Fact]
    public void Codigo_da_api_nao_usa_Console()
    {
        var raiz = BancoDeTeste.LocalizarProjetoApi();
        var achados = Directory.EnumerateFiles(raiz, "*.cs", SearchOption.AllDirectories)
            .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}")
                     && !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                     && !f.Contains($"{Path.DirectorySeparatorChar}tests{Path.DirectorySeparatorChar}"))
            .Where(f => Regex.IsMatch(File.ReadAllText(f), @"\bConsole\.(Write|WriteLine|Error)\b"))
            .ToList();

        Assert.Empty(achados);
    }
}
