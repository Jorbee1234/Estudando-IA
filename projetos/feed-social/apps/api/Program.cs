using Api.Application;
using Api.Http;
using Api.Infrastructure;
using Api.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddRouting(options => options.LowercaseUrls = true);
builder.Services.AddStandardProblemDetails();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();
builder.Services.AddJwtAuthentication();
builder.Services.AddSwaggerDocs();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    await DatabaseInitializer.MigrateAndSeedAsync(app.Services);
}
else
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program;
