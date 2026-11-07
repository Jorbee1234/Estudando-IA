using Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Api.Infrastructure.Persistence;

/// <summary>
/// Development-only mock data: a few users, tags and posts with likes and comments.
/// Deterministic (fixed random seed) and idempotent (does nothing if posts already exist).
/// </summary>
public static class DevDataSeeder
{
    public const string SeedPassword = "Senha@1234";

    private static readonly string[] TagNames =
    [
        "React", "Front-end", "Acessibilidade", "TypeScript", "CSS", "Tailwind",
        "Node.js", "UX", "Testes", "Performance", "API", "Design System",
    ];

    private static readonly (string Name, string Email, string Username)[] Users =
    [
        ("Júlio Costa", "julio@example.com", "julio"),
        ("Ana Souza", "ana@example.com", "ana"),
        ("Marcos Lima", "marcos@example.com", "marcos"),
    ];

    private static readonly (string About, string AccentColor)[] Profiles =
    [
        ("Desenvolvedor front-end apaixonado por acessibilidade e design systems. Compartilho o que aprendo transformando protótipos em código.", "#81FE88"),
        ("Designer e dev. Gosto de interfaces simples, bem testadas e com atenção aos detalhes.", "#7DD3FC"),
        ("Back-end curioso que está se aventurando no front. Aqui registro os estudos e projetos.", "#FDBA74"),
    ];

    private static readonly string[] Subjects =
    [
        "Dashboard de métricas", "Landing page responsiva", "Formulário acessível", "Componentes de botão",
        "Player de música", "Tela de login", "Painel administrativo", "Sistema de design", "Cards de produto",
        "Calendário de eventos", "Menu lateral animado", "Tabela com filtros",
    ];

    private static readonly string[] Approaches =
    [
        "com React e TypeScript", "usando Tailwind", "pensando em acessibilidade", "com foco em performance",
        "do zero, passo a passo", "com testes automatizados",
    ];

    private static readonly string[] Descriptions =
    [
        "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint.",
        "Neste projeto explorei padrões de composição, estados de carregamento e tratamento de erros, mantendo o código simples de evoluir.",
        "Compartilhando o que aprendi montando esta interface: decisões de layout, tokens de design e como organizei os componentes.",
        "Um estudo de caso rápido sobre como transformar um protótipo do Figma em código reutilizável e testado.",
    ];

    private static readonly string[] Comments =
    [
        "Ficou muito bom! Parabéns pelo capricho.", "Pode compartilhar como organizou os componentes?",
        "Adorei a paleta de cores.", "Ótima ideia, vou testar no meu projeto.", "Muito útil, obrigado por compartilhar!",
        "Como ficou a acessibilidade por teclado?",
    ];

    public static async Task SeedAsync(AppDbContext db, IPasswordHasher<User> hasher, CancellationToken cancellationToken = default)
    {
        if (await db.Posts.AnyAsync(cancellationToken))
        {
            return;
        }

        var random = new Random(42);

        var users = new List<User>();
        foreach (var (name, email, username) in Users)
        {
            var existing = await db.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == User.NormalizeEmail(email), cancellationToken);
            if (existing is null)
            {
                existing = new User
                {
                    Name = name,
                    Email = email,
                    NormalizedEmail = User.NormalizeEmail(email),
                    Username = username,
                };
                existing.PasswordHash = hasher.HashPassword(existing, SeedPassword);
                db.Users.Add(existing);
            }

            users.Add(existing);
        }

        var tags = new List<Tag>();
        foreach (var name in TagNames)
        {
            var normalized = Tag.Normalize(name);
            tags.Add(await db.Tags.FirstOrDefaultAsync(t => t.NormalizedName == normalized, cancellationToken)
                ?? db.Tags.Add(new Tag { Name = name, NormalizedName = normalized }).Entity);
        }

        var now = DateTime.UtcNow;
        var posts = new List<Post>();
        for (var i = 0; i < 24; i++)
        {
            var subject = Subjects[i % Subjects.Length];
            var approach = Approaches[random.Next(Approaches.Length)];
            var postTags = tags.OrderBy(_ => random.Next()).Take(random.Next(2, 5)).ToList();

            posts.Add(new Post
            {
                AuthorId = users[random.Next(users.Count)].Id,
                Title = $"{subject} {approach}",
                Description = Descriptions[random.Next(Descriptions.Length)],
                ThumbnailUrl = i % 2 == 0 ? $"https://picsum.photos/seed/codeconnect-{i}/960/480" : null,
                CreatedAt = now.AddHours(-(i * 7 + random.Next(0, 6))),
                PostTags = postTags.Select(t => new PostTag { Tag = t }).ToList(),
            });
        }

        db.Posts.AddRange(posts);
        await db.SaveChangesAsync(cancellationToken);

        for (var i = 0; i < users.Count; i++)
        {
            var userId = users[i].Id;
            if (!await db.UserProfiles.AnyAsync(p => p.UserId == userId, cancellationToken))
            {
                db.UserProfiles.Add(new UserProfile
                {
                    UserId = userId,
                    About = Profiles[i].About,
                    AccentColor = Profiles[i].AccentColor,
                });
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        foreach (var post in posts)
        {
            var likers = users.OrderBy(_ => random.Next()).Take(random.Next(0, users.Count + 1)).ToList();
            foreach (var liker in likers)
            {
                db.PostLikes.Add(new PostLike { PostId = post.Id, UserId = liker.Id, CreatedAt = post.CreatedAt.AddMinutes(random.Next(1, 600)) });
            }

            var commentCount = random.Next(0, 5);
            for (var c = 0; c < commentCount; c++)
            {
                db.Comments.Add(new Comment
                {
                    PostId = post.Id,
                    AuthorId = users[random.Next(users.Count)].Id,
                    Body = Comments[random.Next(Comments.Length)],
                    CreatedAt = post.CreatedAt.AddMinutes(random.Next(1, 1200)),
                });
            }

            post.LikesCount = likers.Count;
            post.CommentsCount = commentCount;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
