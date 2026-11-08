using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUsernames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Username",
                table: "users",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UsernameChangedAt",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                WITH cleaned AS (
                    SELECT "Id",
                           regexp_replace(
                               translate(lower(split_part(btrim("Name"), ' ', 1)),
                                         'áàâãäåéèêëíìîïóòôõöúùûüçñý',
                                         'aaaaaaeeeeiiiiooooouuuucny'),
                               '[^a-z0-9]', '', 'g') AS base
                    FROM users
                ),
                named AS (
                    SELECT "Id",
                           CASE WHEN length(base) < 3 THEN 'user' || base ELSE left(base, 24) END AS name
                    FROM cleaned
                ),
                ranked AS (
                    SELECT "Id", name, row_number() OVER (PARTITION BY name ORDER BY "Id") AS rn
                    FROM named
                )
                UPDATE users u
                SET "Username" = CASE WHEN r.rn = 1 THEN r.name ELSE r.name || '_' || r.rn END
                FROM ranked r
                WHERE u."Id" = r."Id";
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Username",
                table: "users",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_Username",
                table: "users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_users_Username",
                table: "users");

            migrationBuilder.DropColumn(
                name: "Username",
                table: "users");

            migrationBuilder.DropColumn(
                name: "UsernameChangedAt",
                table: "users");
        }
    }
}
