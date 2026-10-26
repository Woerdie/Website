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
- Data and login through Supabase (Auth for the school apps, Realtime for pubgolf).
- New projects are added through the `projects` array in `index.html`.
- `bewindwijs/` holds a client project (BewindWijs tarievenpagina). Don't restyle it as part of Daan's site. It is listed on the hub only as a private project (`private: true`), behind the login in the Privé section.
- Private projects: `prive.js` holds the shared Supabase client and the access check. An account gets access when its `app_metadata.prive` is true, set in the Supabase SQL editor: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"prive": true}' where email = '<e-mail>';`. Private pages load `prive.js` and redirect to `/#prive` without access. This is client-side only: the files stay reachable through the public GitHub repo.
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
