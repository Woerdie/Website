# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mainly Daan's friends and classmates. They come to daanwoerdman.nl to find and open the apps they use together: planning a borrel, keeping score at pubgolf, planning study time before tests. Most already know Daan and arrive with a specific app in mind.

## Product Purpose

daanwoerdman.nl is Daan Woerdman's personal hub and the launchpad for the webapps he builds for his friend group and for school. It works when a visitor quickly finds the app they came for and opens it, or tries one they haven't used yet.

## Positioning

Each app started as a real problem in Daan's own friend group or at school, and the people using it are the people it was built for. The site is a personal place, not a studio or agency front.

## Operating Context

- Projects listed on the hub, grouped by context:
  - Voor de vriendengroep: Borrelplanner (`borrelplanner/`), Pubgolf scorekaart (`pubgolf/`)
  - Voor school: Inhaalplanner (`inhaalplanner/`), Leeromgeving (`inhaalplanner/leren.html`); both need an account
- The hub currently shows each project running live in an embedded viewer with desktop/mobile modes. Whether that stays is an open decision, not a fixed requirement.
- Unconfirmed: visitors likely arrive on phones, via links shared in group chats.
- `Borrelplanner.html` at the root is a redirect kept for old links to `/borrelplanner/`.

## Capabilities and Constraints

- Plain HTML, CSS and JavaScript with no build step, hosted on GitHub Pages under the custom domain daanwoerdman.nl (`CNAME`).
- Data and login through Supabase. One account for the whole site: visitors sign up and log in from the Account popup on the hub, and the session is shared by every app on the domain.
- `account.js` holds the shared Supabase client, the private-access check and `laadAccountData` / `bewaarAccountData`, which keep one JSON blob per user per app in the `user_data` table (`supabase/user_data.sql`, run once). Legenda-maker syncs its networks and selection, Pubgolf its list of games, Borrelplanner the name. Without login those apps keep working locally. Borrelplanner and Pubgolf keep their own anonymous client for their game data.
- New projects are added through the `projects` array in `index.html`.
- `bewindwijs/` holds a client project (BewindWijs tarievenpagina). Don't restyle it as part of Daan's site. It is listed on the hub only as a private project (`private: true`), shown in the Account popup to accounts with access.
- Private projects: an account gets access when its `app_metadata.prive` or `app_metadata.admin` is true. Admins tick who gets access in the Account popup on the hub, through the security-definer functions in `supabase/admin.sql`; who is admin is only set in the Supabase SQL editor. Changes apply after that person logs in again. Private pages load `account.js` and redirect to `/#account` without access. This is client-side only: the files stay reachable through the public GitHub repo.
- `_archief/` holds retired stylesheets; it is reference only.

## Brand Commitments

- All copy is in Dutch.
- Voice is informal and personal, first person ("ik"), written by Daan himself.
- Name: Daan Woerdman, with "DW" used as the monogram.

## Evidence on Hand

- The four live apps themselves are the proof; the site claims that Daan designed and built everything on it.
- No testimonials, user counts, client list or press exist. Do not invent them.

## Product Principles

1. Getting to the app comes first. A friend with a link in a group chat should reach the app in one tap.
2. Personal, not professional. It's a person's site for people who know him, not a pitch.
3. Honest about scale. These are small tools built for real people; don't dress them up as products with users or metrics they don't have.
4. Easy to add to. A new project should take one entry, not a redesign.
