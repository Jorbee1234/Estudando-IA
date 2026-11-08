import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from '../components/pages/LoginPage'
import { FeedPage } from '../components/pages/FeedPage'
import { ProfilePage } from '../components/pages/ProfilePage'
import { AvatarUploadModal } from '../components/organisms/AvatarUploadModal'
import { EditProfileModal } from '../components/organisms/EditProfileModal'
import { ProfileAppearanceModal } from '../components/organisms/ProfileAppearanceModal'
import { SignupPage } from '../components/pages/SignupPage'
import { CreatePostModal } from '../components/organisms/CreatePostModal'
import { LoginModal } from '../components/organisms/LoginModal'
import { SidebarMenu } from '../components/organisms/SidebarMenu'
import { AppTemplate } from '../components/templates/AppTemplate'
import { samplePost, sampleProfile } from './fixtures'
import { findWcagAAViolations } from './axe'

function renderInRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// Automated WCAG 2.x level AA checks (axe-core). Automated tools only catch a
// part of the criteria, so a green run does not replace a manual review.
describe('accessibility (WCAG 2.2 AA)', () => {
  it('reports violations when the markup is inaccessible', async () => {
    render(
      <main>
        <img src="/x.png" />
        <input />
      </main>,
    )

    const violations = await findWcagAAViolations()

    expect(violations.some((line) => line.includes('[image-alt]'))).toBe(true)
    expect(violations.some((line) => line.includes('[label]'))).toBe(true)
  })

  it('LoginPage has no violations', async () => {
    renderInRouter(<LoginPage onLogin={vi.fn()} onSocialLogin={vi.fn()} />)

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('SignupPage has no violations', async () => {
    renderInRouter(<SignupPage onSignup={vi.fn()} onSocialLogin={vi.fn()} />)

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('LoginPage has no violations after a blocked submit', async () => {
    renderInRouter(<LoginPage onLogin={vi.fn()} onSocialLogin={vi.fn()} />)

    await userEvent.click(document.querySelector('button[type="submit"]')!)

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('SignupPage has no violations after a blocked submit', async () => {
    renderInRouter(<SignupPage onSignup={vi.fn()} onSocialLogin={vi.fn()} />)

    await userEvent.click(document.querySelector('button[type="submit"]')!)

    expect(await findWcagAAViolations()).toEqual([])
  })
})

describe('accessibility of the feed (WCAG 2.2 AA)', () => {
  it('FeedPage has no violations', async () => {
    render(
      <MemoryRouter>
        <FeedPage
          filters={{
            searchText: '',
            onSearchChange: vi.fn(),
            selectedTags: ['React'],
            suggestedTags: ['CSS'],
            onAddTag: vi.fn(),
            onRemoveTag: vi.fn(),
            onClear: vi.fn(),
          }}
          sort="recent"
          onSortChange={vi.fn()}
          posts={[samplePost]}
          loading={false}
          loadingMore={false}
          hasMore
          onLoadMore={vi.fn()}
          onLike={vi.fn()}
          onShare={vi.fn()}
          onComment={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('AppTemplate with the sidebar has no violations', async () => {
    render(
      <MemoryRouter>
        <AppTemplate
          sidebar={
            <SidebarMenu authenticated={false} onPublish={vi.fn()} onLogin={vi.fn()} onLogout={vi.fn()} />
          }
        >
          <h1>Feed</h1>
        </AppTemplate>
      </MemoryRouter>,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('LoginModal has no violations', async () => {
    render(
      <MemoryRouter>
        <LoginModal open onClose={vi.fn()} onLogin={vi.fn()} />
      </MemoryRouter>,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('CreatePostModal has no violations', async () => {
    render(<CreatePostModal open onClose={vi.fn()} onSubmit={vi.fn()} />)

    expect(await findWcagAAViolations()).toEqual([])
  })
})

describe('accessibility of the profile (WCAG 2.2 AA)', () => {
  const profileProps = {
    profile: { ...sampleProfile, accentColor: '#7DD3FC' },
    loading: false,
    onEditAvatar: vi.fn(),
    onEditAppearance: vi.fn(),
    onEditProfile: vi.fn(),
    posts: [samplePost],
    postsLoading: false,
    loadingMore: false,
    hasMore: true,
    onLoadMore: vi.fn(),
    onLike: vi.fn(),
    onShare: vi.fn(),
    onComment: vi.fn(),
  }

  it('ProfilePage has no violations for a visitor', async () => {
    render(
      <MemoryRouter>
        <ProfilePage {...profileProps} isOwner={false} />
      </MemoryRouter>,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('ProfilePage has no violations for the owner', async () => {
    render(
      <MemoryRouter>
        <ProfilePage {...profileProps} isOwner />
      </MemoryRouter>,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('EditProfileModal has no violations, with and without errors', async () => {
    const { unmount } = render(
      <EditProfileModal open onClose={vi.fn()} profile={profileProps.profile} onSave={vi.fn()} />,
    )
    expect(await findWcagAAViolations()).toEqual([])
    unmount()

    render(<EditProfileModal open onClose={vi.fn()} profile={profileProps.profile} onSave={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText('Nome'))
    await userEvent.clear(screen.getByLabelText('@username'))
    await userEvent.type(screen.getByLabelText('@username'), 'x')

    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(await findWcagAAViolations()).toEqual([])
  })

  it('EditProfileModal has no violations with an API error after submitting', async () => {
    render(
      <EditProfileModal
        open
        onClose={vi.fn()}
        profile={profileProps.profile}
        onSave={vi.fn()}
        fieldErrors={{ username: 'Este @username já está em uso.' }}
      />,
    )
    await userEvent.clear(screen.getByLabelText('@username'))
    await userEvent.type(screen.getByLabelText('@username'), 'ana')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('já está em uso')
    expect(await findWcagAAViolations()).toEqual([])
  })

  it('EditProfileModal has no violations when the username is locked', async () => {
    const unlock = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    render(
      <EditProfileModal
        open
        onClose={vi.fn()}
        profile={{ ...profileProps.profile, usernameChangeAvailableAt: unlock }}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('@username')).toBeDisabled()
    expect(await findWcagAAViolations()).toEqual([])
  })

  it('ProfilePage has no violations when the profile is not found', async () => {
    render(
      <MemoryRouter>
        <ProfilePage {...profileProps} profile={undefined} isOwner={false} error="Perfil não encontrado." posts={[]} />
      </MemoryRouter>,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('AvatarUploadModal has no violations', async () => {
    render(
      <AvatarUploadModal
        open
        onClose={vi.fn()}
        avatarUrl="/api/profiles/u1/avatar?v=1"
        onSave={vi.fn()}
        onRemove={vi.fn()}
        error="Falhou."
      />,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('ProfileAppearanceModal has no violations', async () => {
    render(
      <ProfileAppearanceModal
        open
        onClose={vi.fn()}
        bannerUrl="/api/profiles/u1/banner?v=1"
        accentColor="#7DD3FC"
        onSave={vi.fn()}
      />,
    )

    expect(await findWcagAAViolations()).toEqual([])
  })

  it('ProfileAppearanceModal has no violations when the color has low contrast', async () => {
    render(<ProfileAppearanceModal open onClose={vi.fn()} bannerUrl={null} accentColor="#111111" onSave={vi.fn()} />)

    expect(await findWcagAAViolations()).toEqual([])
  })
})
