using System.Globalization;

namespace Api.Application.Common;

public static class Messages
{
    public static class Titles
    {
        public const string BadRequest = "Requisição inválida.";
        public const string Unauthorized = "Autenticação necessária ou credenciais inválidas.";
        public const string Forbidden = "Você não tem permissão para esta ação.";
        public const string NotFound = "Recurso não encontrado.";
        public const string Conflict = "Conflito com o estado atual do recurso.";
        public const string Unprocessable = "Não foi possível processar os dados enviados.";
        public const string ServerError = "Erro interno. Tente novamente mais tarde.";

        public static string For(int status) => status switch
        {
            400 => BadRequest,
            401 => Unauthorized,
            403 => Forbidden,
            404 => NotFound,
            409 => Conflict,
            422 => Unprocessable,
            >= 500 => ServerError,
            _ => BadRequest,
        };
    }

    public static class Codes
    {
        public const string ValidationFailed = "validation.failed";
        public const string Unauthenticated = "auth.unauthenticated";
        public const string Forbidden = "auth.forbidden";
        public const string InvalidCredentials = "auth.invalid_credentials";
        public const string EmailTaken = "user.email_taken";
        public const string PostNotFound = "post.not_found";
        public const string InvalidThumbnail = "post.invalid_thumbnail";
        public const string TagTooLong = "post.tag_too_long";
        public const string CommentEmpty = "comment.empty";
        public const string InvalidCursor = "feed.invalid_cursor";
        public const string ProfileNotFound = "profile.not_found";
        public const string AboutTooLong = "profile.about_too_long";
        public const string InvalidAccentColor = "profile.invalid_accent_color";
        public const string LowContrastAccentColor = "profile.low_contrast_accent_color";
        public const string InvalidImageType = "profile.invalid_image_type";
        public const string ImageTooLarge = "profile.image_too_large";
        public const string ImageMissing = "profile.image_missing";
        public const string ImageNotFound = "profile.image_not_found";
        public const string InvalidName = "profile.invalid_name";
        public const string InvalidUsername = "profile.invalid_username";
        public const string UsernameTaken = "profile.username_taken";
        public const string UsernameChangeTooSoon = "profile.username_change_too_soon";
        public const string ServerError = "server.error";

        public static readonly IReadOnlyList<string> All =
        [
            ValidationFailed, Unauthenticated, Forbidden, InvalidCredentials, EmailTaken,
            PostNotFound, InvalidThumbnail, TagTooLong, CommentEmpty, InvalidCursor,
            ProfileNotFound, AboutTooLong, InvalidAccentColor, LowContrastAccentColor,
            InvalidImageType, ImageTooLarge, ImageMissing, ImageNotFound,
            InvalidName, InvalidUsername, UsernameTaken, UsernameChangeTooSoon, ServerError,
        ];
    }

    public const string ValidationFailed = "Um ou mais campos são inválidos.";
    public const string Unauthenticated = "Faça login para realizar esta ação.";
    public const string Forbidden = "Você não tem permissão para realizar esta ação.";
    public const string InvalidCredentials = "E-mail ou senha inválidos.";
    public const string EmailTaken = "Já existe uma conta com este e-mail.";
    public const string PostNotFound = "Publicação não encontrada.";
    public const string InvalidThumbnail = "A imagem de capa deve ser uma URL http ou https.";
    public const string TagTooLong = "Cada tag deve ter no máximo 30 caracteres.";
    public const string CommentEmpty = "O comentário não pode estar em branco.";
    public const string InvalidCursor = "O cursor informado é inválido para esta ordenação.";
    public const string ProfileNotFound = "Perfil não encontrado.";
    public const string AboutTooLong = "O texto sobre você deve ter no máximo 500 caracteres.";
    public const string InvalidAccentColor = "A cor de destaque deve estar no formato #RRGGBB.";
    public const string LowContrastAccentColor = "Esta cor tem pouco contraste com o fundo escuro. Escolha uma cor mais clara.";
    public const string InvalidImageType = "A imagem deve ser PNG, JPEG ou WebP.";
    public const string AvatarTooLarge = "A foto de perfil deve ter no máximo 2 MB.";
    public const string BannerTooLarge = "O banner deve ter no máximo 4 MB.";
    public const string ImageMissing = "Envie um arquivo de imagem.";
    public const string ImageNotFound = "Imagem não encontrada.";
    public const string InvalidName = "O nome deve ter de 2 a 100 caracteres.";
    public const string InvalidUsername = "O @username deve ter de 3 a 30 caracteres: letras minúsculas, números ou _ (e não pode ser uma palavra reservada).";
    public const string UsernameTaken = "Este @username já está em uso.";

    public static string UsernameChangeTooSoon(DateTime availableAt) =>
        $"O @username só pode ser trocado a cada 30 dias. Você poderá trocar de novo em {availableAt.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture)}.";

    public const string InvalidSort ="A ordenação deve ser 'recent' ou 'popular'.";
    public const string ServerError = "Ocorreu um erro inesperado. Tente novamente em instantes.";
}
