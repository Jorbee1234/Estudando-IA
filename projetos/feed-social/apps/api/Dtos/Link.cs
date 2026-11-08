namespace Api.Dtos;

/// <summary>Hypermedia link to a related resource or available action.</summary>
/// <param name="Rel">Relation of the link to the current resource.</param>
/// <param name="Href">Target URL.</param>
/// <param name="Method">HTTP method to use on the target.</param>
public sealed record Link(string Rel, string Href, string Method);
