using System.Net.Http.Json;

namespace Api.Tests.Support;

public static class HttpClientExtensions
{
    public static Task<HttpResponseMessage> PatchJsonAsync<T>(this HttpClient client, string uri, T body) =>
        client.SendAsync(new HttpRequestMessage(HttpMethod.Patch, uri) { Content = JsonContent.Create(body) });
}
