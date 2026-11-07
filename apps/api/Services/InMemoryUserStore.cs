using System.Collections.Concurrent;
using Api.Models;

namespace Api.Services;

public sealed class InMemoryUserStore : IUserStore
{
    private readonly ConcurrentDictionary<string, User> _byEmail = new();
    private readonly ConcurrentDictionary<Guid, User> _byId = new();

    public static string Normalize(string email) => email.Trim().ToLowerInvariant();

    public bool TryAdd(User user)
    {
        if (!_byEmail.TryAdd(Normalize(user.Email), user))
        {
            return false;
        }

        _byId[user.Id] = user;
        return true;
    }

    public User? FindByEmail(string email) =>
        _byEmail.TryGetValue(Normalize(email), out var user) ? user : null;

    public User? FindById(Guid id) =>
        _byId.TryGetValue(id, out var user) ? user : null;
}
