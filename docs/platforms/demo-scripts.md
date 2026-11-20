# Demo video scripts

One script per platform review, in the order to record them. Each matches Ispector's actual screens (checked 2026-11-20).
Permission details and the review forms are in [app-review.md](app-review.md).

## Before recording (all platforms)

**Tools.** Windows Snipping Tool can record the screen: press Win+Shift+R, drag over the browser window, then click Start. It saves an MP4. OBS Studio is the alternative if you want a cursor highlight or a voice track.

**Browser setup:**
- Use a fresh Chrome profile, or a guest window, so no other tabs, bookmarks or extensions show.
- Window about 1440×900, zoom 100%, address bar visible the whole time. Reviewers check the domain.
- Turn off notifications (Windows Focus) so nothing pops up mid-recording.

**Account:**
- Record with **your own** Ispector account and your own platform accounts, so real numbers show.
- Use real data, not simulated accounts.
- Don't use the reviewer account for recording.

**Pace:**
- Move slowly. Pause about 2 seconds on every screen that shows data.
- Hover over a chart point so the numbers are readable.
- Narration is optional. On-screen captions work: either type them in a video editor (Clipchamp is built into Windows), or keep a small sticky note visible in the corner.

**Start state:**
1. In Ispector, go to Settings and **Disconnect** the platform you're recording. This makes the connect step and the consent screen happen on camera.
2. Sign out of Ispector. Every video starts signed out.

**Length.** Aim for 1½–3 minutes per video. Keep each file under 50 MB for TikTok; record at 1080p and trim the dead time.

---

## 1. TikTok (Login Kit + Display API)

**Upload:** 1 video, MP4, under 50 MB. TikTok allows up to 5 files.
**Needs:** the TikTok account you connect must be a sandbox target user in the TikTok developer portal, with a few posted videos.

| # | Do | Caption / say |
| --- | --- | --- |
| 1 | Open `https://ispector.site`. Scroll the homepage slowly to the platform list and the preview. Pause on the address bar. | "Ispector is a read-only analytics dashboard for creators. It never posts for you." |
| 2 | Click **Sign in** and sign in with your usual method. | "Signing in to Ispector." |
| 3 | Go to **Settings** → **Connected accounts**. Point at TikTok showing "Connect to include it in your dashboard". | "TikTok is not connected yet." |
| 4 | Click **Connect** next to TikTok. | "Connecting TikTok with Login Kit." |
| 5 | On TikTok's page, sign in to the sandbox TikTok account. Stop on the **consent screen** and hold it for 3 seconds so all four permissions are readable. | "TikTok asks for: basic info, profile info, stats, and video list." |
| 6 | Click **Authorize**. Back in Ispector, wait for the import to finish. | "Back in Ispector, the first import runs." |
| 7 | In Settings, point at TikTok now showing the **@username** and "Updated …". | "user.info.basic and user.info.profile: we show the account's display name and @username." |
| 8 | Open **Platforms**, then the TikTok card. Pause on followers, likes and the video count; hover the followers chart. | "user.info.stats: followers, likes and video counts, tracked daily." |
| 9 | Open **Content**. Set the **Platform** menu to **TikTok**. Pause on the video cards; click one to open its details (views, likes, comments, shares). | "video.list: the account's recent videos with their views, likes, comments and shares." |
| 10 | Open **Overview** and hover the **Views per day** chart on the TikTok line. | "Daily views across platforms, with a line per platform." |
| 11 | Go to **Settings** → **Disconnect** TikTok → confirm. Show it back to "not connected". | "People can disconnect at any time; we delete TikTok data straight away." |
| 12 | Open `https://ispector.site/privacy` and scroll to the TikTok section. | "Our privacy policy lists exactly what we read and how to remove access." |

**Form text, one line per permission:**
- `user.info.basic`: identifies the connected TikTok account and shows its display name in Settings.
- `user.info.profile`: shows the account's @username so the person can see which account is connected.
- `user.info.stats`: reads follower, like and video counts to chart the account's growth on the Platforms page.
- `video.list`: lists the account's recent videos with their view, like, comment and share counts on the Content page.

---

## 2. Meta (Facebook + Instagram)

**Upload:** **one video per permission.** Each video is short (about 1 minute) and follows the same opening, then shows that permission's screen. Record the opening once and reuse it at the start of every clip in Clipchamp.

**Before:**
- Disconnect both Facebook and Instagram in Settings.
- In the Meta dialog, tick **both** the Page and the Instagram account.

**Shared opening (steps 1–5 of every clip):**
1. Open `https://ispector.site` with the address bar visible, then **Sign in**.
2. **Settings** → **Connected accounts** → **Connect** next to Facebook.
3. Facebook login appears. Sign in if asked.
4. Meta's dialog lists the permissions and the business assets. Tick your Page and your Instagram account, and hold for 3 seconds.
5. Approve. Back in Ispector, wait for the import. Facebook and Instagram both show as connected.

**Then, per permission:**

| Permission | Show after the opening | Caption |
| --- | --- | --- |
| `pages_show_list` | The Page you picked in Meta's dialog, then its name next to Facebook in Settings. | "We list the Pages you manage so you can connect one." |
| `pages_read_engagement` | **Platforms** → Facebook: followers, and the reactions and comments on posts. Hover the chart. | "Page followers and engagement on its posts." |
| `pages_read_user_content` | **Content** → Platform menu → **Facebook**. Scroll the Page's posts; open one. | "The Page's published posts, so we can rank them." |
| `read_insights` | **Overview** → Views per day, hovering the Facebook line; then Platforms → Facebook "Views · 30 days" and "Views per post". **The numbers must be visible.** | "Daily Page views and engagement from Page Insights." |
| `instagram_basic` | Settings showing the Instagram account name; **Content** → Platform → **Instagram** (posts and reels). | "The Instagram account and its posts and reels." |
| `instagram_manage_insights` | **Platforms** → Instagram (daily views, interactions), then **Audience** (age, gender and country). **The numbers must be visible.** | "Daily views and interactions, and audience demographics." |
| `business_management` | In the shared opening, hold on the Meta dialog step that lists the **business** and its assets. Then show Instagram connected in Settings. | "Needed to find the Instagram account linked to a Page inside a business portfolio." |

End each clip with **Settings** → Disconnect Facebook, then open `/data-deletion` for 2 seconds.

---

## 3. Google (YouTube)

**Upload:** 1 video to YouTube, **Unlisted**. Paste its link in the verification form.
**Before:** in Ispector, disconnect YouTube. Sign out of Ispector. Stay signed in to Google.

| # | Do | Caption |
| --- | --- | --- |
| 1 | Open `https://ispector.site` (address bar visible). Scroll to the footer links Privacy / Terms / Data deletion. | "Ispector: read-only analytics. Homepage and privacy policy on our verified domain." |
| 2 | **Sign in**. | |
| 3 | **Settings** → **Connect** next to YouTube. | |
| 4 | On Google's consent screen: hold on the app name **Ispector**. Then **click into the address bar and scroll through the URL to `client_id=`** so the OAuth client ID is readable. | "App name and OAuth client ID." |
| 5 | Show both permissions on the consent screen (expand any details), then **Continue**. | "We request YouTube read-only and YouTube Analytics read-only." |
| 6 | Settings: YouTube shows the channel name. | "youtube.readonly: the channel's name and subscriber count." |
| 7 | **Platforms** → YouTube: subscribers chart, "Views · 30 days". Hover the chart. | "yt-analytics.readonly: daily views and subscriber changes." |
| 8 | **Content** → Platform → **YouTube**: videos with thumbnails; open one. | "youtube.readonly: the channel's videos and their stats." |
| 9 | **Overview**: hover the YouTube line on Views per day. | |
| 10 | **Settings** → **Disconnect** YouTube. | "Disconnecting deletes the data and revokes our access." |
| 11 | `/privacy` → scroll to the Google section (Limited Use, link to Google's permissions page). | "We follow Google's Limited Use requirements." |

---

## 4. LinkedIn (Community Management API)

Record this **only after** LinkedIn grants Development-tier access, because the connect step fails before that.

| # | Do | Caption |
| --- | --- | --- |
| 1 | `https://ispector.site` → **Sign in**. | |
| 2 | **Settings** → **Connect** next to LinkedIn. | |
| 3 | LinkedIn's consent screen: hold so the permissions are readable. **Allow**. | "We request organization admin read and organization social read." |
| 4 | Settings: the company Page name next to LinkedIn. | "rw_organization_admin: finding the Pages you administer. We only read." |
| 5 | **Platforms** → LinkedIn: followers and impressions. Hover the chart. | "Follower and share statistics." |
| 6 | **Content** → Platform → **LinkedIn**: the Page's posts. | "r_organization_social: the Page's posts and their statistics." |
| 7 | **Settings** → **Disconnect** LinkedIn. | |

---

## After recording

- Watch each video once before uploading. Check that the address bar, the consent screen and the data screens are all readable.
- Blur nothing important. Do blur or crop your personal email if it shows.
- Keep the raw files: Meta and TikTok often ask for a re-recording of one step rather than the whole video.
