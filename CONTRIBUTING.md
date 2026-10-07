# Contributing to md3-react

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

```bash
git clone https://github.com/<owner>/md3-react.git
cd md3-react
npm install
npm run dev      # Storybook dev server
```

## Development Workflow

1. Create a feature branch from `develop` (`main` only receives releases)
2. Make your changes
3. Ensure all checks pass:
   ```bash
   npm run typecheck  # TypeScript type checking
   npm test           # Unit tests
   npm run build      # Library build
   ```
4. Commit using [Conventional Commits](#commit-messages) format
5. Open a Pull Request against `develop`

## Documentation site

The site in `site/` is published from **`main`**, so it always documents the
released package (npm `latest`). Pull requests that touch the site or the
library build the site as a check, without deploying. Docs changes merged into
`develop` go live with the next release; ship an urgent docs-only fix as a
patch release (or re-run the Docs workflow on `main` after the fix reaches
`main`).

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/).
A git hook (`commitlint`) enforces this automatically on every commit.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | A new feature                                    |
| `fix`      | A bug fix                                        |
| `docs`     | Documentation only changes                       |
| `style`    | Code style changes (formatting, no logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                          |
| `test`     | Adding or updating tests                         |
| `build`    | Changes to build system or dependencies          |
| `ci`       | CI configuration changes                         |
| `chore`    | Other changes that don't modify src or test files |
| `revert`   | Reverts a previous commit                        |

### Examples

```
feat: add TextField component
fix: correct outline border color in outlined Button
docs: update README with usage examples
refactor(Switch): simplify toggle state management
```

## Code Conventions

- **CSS**: CSS Modules (`.module.css`) with private `--_*` tokens referencing `--md-sys-*` system tokens
- **Components**: `forwardRef`, react-aria for interaction, controlled + uncontrolled patterns
- **Testing**: Vitest + Testing Library; every component must include an axe a11y test
- **Specs**: Follow [m3.material.io](https://m3.material.io) as the primary source of truth

See [CLAUDE.md](CLAUDE.md) for the full set of conventions.
