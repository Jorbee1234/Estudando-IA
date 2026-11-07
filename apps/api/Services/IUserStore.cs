using Api.Models;

namespace Api.Services;

public interface IUserStore
{
    /// <summary>Adds the user. Returns false if the e-mail is already taken.</summary>
    bool TryAdd(User user);

    User? FindByEmail(string email);

    User? FindById(Guid id);
}
