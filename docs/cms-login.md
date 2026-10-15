# CMS login and access

Open [aldahub.com/admin/](https://aldahub.com/admin/) to use the Alda Hub content studio. The entry screen uses the website's paper, ink and lime colors, shows the existing signed-in account, and offers login, resume and logout actions. The email/password and password-recovery form remains the official Netlify Identity widget.

## Existing accounts and permissions

- Authentication remains Netlify Identity; content access remains Decap CMS `git-gateway`.
- `admin/config.yml` continues to target the existing `alda` repository's `main` branch. Saving in CMS creates a repository commit; Netlify then rebuilds the website.
- This change does not create accounts, reset passwords, enable open registration or change editor roles. The site owner manages users in [Netlify → AldaHub → Identity](https://app.netlify.com/projects/aldahub/identity).
- Confirm the project's registration preference is **Invite only** if access should be restricted to invited editors. Do not enable public registration to fix a login problem.
- An invited editor uses the invitation email to set their password. An existing editor can use **Forgot password?** in the Identity login modal. Never share the password or email token in a GitHub issue, screenshot or commit.

## Invitation and recovery links

The public website forwards Netlify Identity email callback fragments to `/admin/` on the same origin. The Identity widget consumes the fragment and displays its confirmation/password screen. The custom entry screen does not parse, save or log token values, and does not replace that flow with its own authentication.

If a link is expired or has already been used, request a new invitation or recovery email. Test these flows on the deployed website using an account you own. A local HTML preview does not prove production authentication works.

## Loading behavior

The Identity widget initializes once. The local bootstrap, Identity widget and pinned Decap CMS 3.17.1 bundle intentionally load in that order before `DOMContentLoaded`. This lets both integrations subscribe to the same Identity initialization event and avoids Decap's fallback starting a second widget. Do not change these scripts to `async` or move Decap loading until after Identity initializes. Decap's automatic application initialization is disabled; entering the editor loads `/admin/preview.js` before `CMS.init()` runs. Configuration continues to load from `admin/config.yml` with no runtime backend or branch override.

If a CDN or script fails to load, the entry screen shows an error and **Thử tải lại**. Retry reloads the page instead of starting duplicate widgets. If login works but content access fails, check Identity and Git Gateway settings and repository permissions; do not delete Identity users or switch the backend as a first troubleshooting step.

Production verification still requires the owner to log in, open a draft, check the editor preview and log out. No real account login, invitation, reset email or production content write was performed during local implementation.

References: [Decap manual initialization](https://decapcms.org/docs/manual-initialization/), [Decap custom mount element](https://decapcms.org/docs/custom-mounting/), [Decap Git Gateway](https://decapcms.org/docs/git-gateway-backend/), [Netlify Identity widget API](https://github.com/netlify/netlify-identity-widget#usage), [Netlify registration preferences](https://docs.netlify.com/security/secure-access-to-sites/identity/registration-login/).
