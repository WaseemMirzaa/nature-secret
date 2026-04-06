# Mobile typography scale (≤640px)

Global overrides live in **`app/globals.css`** inside `@media (max-width: 640px)` (aligned with Tailwind’s `sm` breakpoint).

## Rules

| Tier | Change | Examples |
|------|--------|----------|
| **Smallest copy** | **+3px** vs default | `text-xs` (12→15px), `text-[10px]`→13px, `text-[11px]`→14px, `text-[12px]`→15px |
| **Body & up** | **+2px** vs default | `text-sm` through `text-6xl`, `text-[13px]`→15px, `text-[15px]`→17px |

## Content blocks

- **`.blog-prose`** — Slightly larger base and H2/H3 on small screens for journal posts.
- **`.product-description`** — Base and `p`/`li` set to **1rem (16px)** on mobile so HTML descriptions and bullets match the intent (+2px vs typical 14px `text-sm` body).

## Scope

- Applies to the **whole site** on narrow viewports (storefront + admin when viewed on a phone).
- **Desktop / tablet** (`min-width: 641px`) is unchanged.

## Rollback

Remove or comment out the `@media (max-width: 640px) { ... }` block for mobile typography in `globals.css`.
