using Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Api.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<PostTag> PostTags => Set<PostTag>();
    public DbSet<PostLike> PostLikes => Set<PostLike>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Name).HasMaxLength(200).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(320).IsRequired();
            entity.Property(u => u.NormalizedEmail).HasMaxLength(320).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Username).HasMaxLength(Username.MaxLength).IsRequired();
            entity.HasIndex(u => u.NormalizedEmail).IsUnique();
            entity.HasIndex(u => u.Username).IsUnique();
        });

        modelBuilder.Entity<Post>(entity =>
        {
            entity.ToTable("posts");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Title).HasMaxLength(120).IsRequired();
            entity.Property(p => p.Description).HasMaxLength(2000).IsRequired();
            entity.Property(p => p.ThumbnailUrl).HasMaxLength(2048);
            entity.HasOne(p => p.Author).WithMany().HasForeignKey(p => p.AuthorId).OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(p => new { p.CreatedAt, p.Id }).IsDescending(true, true);
            entity.HasIndex(p => new { p.LikesCount, p.CreatedAt, p.Id }).IsDescending(true, true, true);
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.ToTable("tags");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).HasMaxLength(50).IsRequired();
            entity.Property(t => t.NormalizedName).HasMaxLength(50).IsRequired();
            entity.HasIndex(t => t.NormalizedName).IsUnique();
        });

        modelBuilder.Entity<PostTag>(entity =>
        {
            entity.ToTable("post_tags");
            entity.HasKey(pt => new { pt.PostId, pt.TagId });
            entity.HasOne(pt => pt.Post).WithMany(p => p.PostTags).HasForeignKey(pt => pt.PostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(pt => pt.Tag).WithMany(t => t.PostTags).HasForeignKey(pt => pt.TagId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(pt => pt.TagId);
        });

        modelBuilder.Entity<PostLike>(entity =>
        {
            entity.ToTable("post_likes");
            entity.HasKey(l => new { l.PostId, l.UserId });
            entity.HasOne<Post>().WithMany().HasForeignKey(l => l.PostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<User>().WithMany().HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Comment>(entity =>
        {
            entity.ToTable("comments");
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Body).HasMaxLength(1000).IsRequired();
            entity.HasOne<Post>().WithMany().HasForeignKey(c => c.PostId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(c => c.Author).WithMany().HasForeignKey(c => c.AuthorId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(c => new { c.PostId, c.CreatedAt });
        });

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("user_profiles");
            entity.HasKey(p => p.UserId);
            entity.Property(p => p.About).HasMaxLength(UserProfile.AboutMaxLength);
            entity.Property(p => p.AvatarData).HasColumnType("bytea");
            entity.Property(p => p.AvatarContentType).HasMaxLength(50);
            entity.Property(p => p.BannerData).HasColumnType("bytea");
            entity.Property(p => p.BannerContentType).HasMaxLength(50);
            entity.Property(p => p.AccentColor).HasMaxLength(7);
            entity.HasOne<User>().WithOne().HasForeignKey<UserProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
