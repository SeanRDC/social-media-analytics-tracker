# Demo video scripts

One script per platform review, in the order we're submitting: **Google (YouTube) → TikTok → Facebook → Instagram**, then LinkedIn once it's available.
Each script matches Ispector's actual screens (checked 2026-11-21). The permission table and the review forms are in [app-review.md](app-review.md).

Facebook and Instagram are reviewed together in **one Meta App Review submission** (they share one Meta app). Record the Facebook clips and the Instagram clips separately, then submit them together.

---

## How to record (step by step)

### 1. Get the computer ready (once)

1. **Turn on Do Not Disturb** so no notification pops up mid-recording: Windows Settings → System → Notifications → Do not disturb: On.
2. **Make a clean Chrome profile:** Chrome → your profile icon (top right) → **Add** → "Continue without an account" → name it "Recording". This gives you a window with no bookmarks, extensions or other tabs. Do every recording in it.
3. In that window press **Ctrl+0** (zoom 100%) and make the window about full screen. Keep the **address bar visible** the whole time; reviewers check the domain.
4. **Sign in** (in that profile) to the platform account you'll connect: your YouTube/Google account, your TikTok sandbox test account, your Facebook account. Stay **signed out of Ispector**, since every video starts there.

### 2. Before each recording

1. In Ispector (in a normal window), go to **Settings → Connected accounts** and **Disconnect** the platform you're about to record, so the connect step and the platform's consent screen happen on camera.
2. Sign out of Ispector in the Recording window.
3. Read the script below once and keep it open on your phone or a second screen.

### 3. Record

**Windows Snipping Tool** (built in, saves MP4):
1. Press **Win+Shift+R**.
2. Drag a box around the whole Chrome window.
3. Click **Start** and wait for the 3-second countdown.
4. Follow the script. Move slowly, and pause about 2 seconds on every screen that shows data. Hover chart points so the numbers are readable.
5. Click the **red Stop** button in the Snipping Tool bar.
6. In the preview, click **Save** (the floppy-disk icon). It saves to `Videos\Screen Recordings`. Rename the file, e.g. `google-youtube-demo.mp4`.

If something goes wrong mid-way (a typo, a pop-up), just stop and start again. Short re-takes are easier than editing.

### 4. Captions and trimming (Clipchamp, built into Windows)

1. Open **Clipchamp** (Start menu) → **Create a new video** → drag in your MP4.
2. **Trim** dead time at the start and end: select the clip on the timeline and drag its edges.
3. **Captions:** **Text** (left menu) → pick "Plain text" → drag it onto the timeline above the clip at the right moment → type the caption from the script. Keep each caption on screen for 3–4 seconds.
4. **Export** → **1080p**. Check the file size: TikTok's limit is 50 MB per file.

### 5. Upload where each platform wants it

| Platform | Where the video goes |
| --- | --- |
| Google | Upload to **YouTube Studio** → set **Visibility: Unlisted** → copy the link into the verification form |
| TikTok | Upload the MP4 file in the app review form (up to 5 files, 50 MB each) |
| Meta | Upload one MP4 per permission in App Review (each permission has its own upload box) |
| LinkedIn | Upload in the access request form when asked |

### 6. Send it to Claude before submitting

Tell me the file path (e.g. `C:\Users\sean\Videos\Screen Recordings\google-youtube-demo.mp4`). I'll pull frames from it and check it against the script and the platform's rules before you submit.

---

## 1. Google (YouTube)

**Upload:** 1 video to YouTube, **Unlisted**. Paste its link in the Google verification form.
**Before:** in Ispector, disconnect YouTube. In the Recording window, stay signed in to Google and signed out of Ispector.

| # | Do | Caption |
| --- | --- | --- |
| 1 | Open `https://ispector.site` (address bar visible). Scroll slowly to the footer links Privacy / Terms / Data deletion. | "Ispector: read-only analytics. Homepage and privacy policy on our verified domain." |
| 2 | Click **Sign in** and sign in. | |
| 3 | **Settings** → **Connected accounts** → **Connect** next to YouTube. | |
| 4 | On Google's consent screen: hold on the app name **Ispector**. Then **click into the address bar and scroll through the URL to `client_id=`** so the OAuth client ID is readable. Hold 3 seconds. | "App name and OAuth client ID." |
| 5 | Show both permissions on the consent screen (click any "details" link to expand them), then **Continue**. | "We request YouTube read-only and YouTube Analytics read-only." |
| 6 | Back in Ispector, wait for the import. In Settings, point at YouTube showing the channel name. | "youtube.readonly: the channel's name and subscriber count." |
| 7 | **Platforms** → the YouTube card: subscribers chart and "Views · 30 days". Hover the chart. | "yt-analytics.readonly: daily views and subscriber changes." |
| 8 | **Content** → Platform menu → **YouTube**: videos with thumbnails. Click one to open its details. | "youtube.readonly: the channel's videos and their stats." |
| 9 | **Overview**: hover the YouTube line on "Views per day". | |
| 10 | **Settings** → **Disconnect** YouTube → confirm. | "Disconnecting deletes the data and revokes our access." |
| 11 | Open `https://ispector.site/privacy` and scroll to the Google section (Limited Use, link to Google's permissions page). | "We follow Google's Limited Use requirements." |

---

## 2. TikTok (Login Kit + Display API)

**Upload:** 1 video, MP4, under 50 MB (TikTok allows up to 5 files).
**Needs:** the TikTok account you connect must be a **sandbox target user** in the TikTok developer portal, with a few posted videos.

| # | Do | Caption |
| --- | --- | --- |
| 1 | Open `https://ispector.site`. Scroll the homepage slowly to the platform list and the preview. Pause on the address bar. | "Ispector is a read-only analytics dashboard for creators. It never posts for you." |
| 2 | Click **Sign in** and sign in. | "Signing in to Ispector." |
| 3 | **Settings** → **Connected accounts**. Point at TikTok showing "Connect to include it in your dashboard". | "TikTok is not connected yet." |
| 4 | Click **Connect** next to TikTok. | "Connecting TikTok with Login Kit." |
| 5 | On TikTok's page, sign in to the sandbox account. Stop on the **consent screen** and hold it for 3 seconds so all four permissions are readable. | "TikTok asks for: basic info, profile info, stats, and video list." |
| 6 | Click **Authorize**. Back in Ispector, wait for the import to finish. | "Back in Ispector, the first import runs." |
| 7 | In Settings, point at TikTok now showing the **@username** and "Updated …". | "user.info.basic and user.info.profile: we show the account's display name and @username." |
| 8 | **Platforms** → the TikTok card. Pause on followers, likes and the video count; hover the followers chart. | "user.info.stats: followers, likes and video counts, tracked daily." |
| 9 | **Content** → Platform menu → **TikTok**. Pause on the video cards; click one (views, likes, comments, shares). | "video.list: the account's recent videos with their views, likes, comments and shares." |
| 10 | **Overview**: hover the TikTok line on "Views per day". | "Daily views across platforms, with a line per platform." |
| 11 | **Settings** → **Disconnect** TikTok → confirm. | "People can disconnect at any time; we delete TikTok data straight away." |
| 12 | Open `https://ispector.site/privacy` and scroll to the TikTok section. | "Our privacy policy lists exactly what we read and how to remove access." |

**Form text, one line per permission:**
- `user.info.basic`: identifies the connected TikTok account and shows its display name in Settings.
- `user.info.profile`: shows the account's @username so the person can see which account is connected.
- `user.info.stats`: reads follower, like and video counts to chart the account's growth on the Platforms page.
- `video.list`: lists the account's recent videos with their view, like, comment and share counts on the Content page.

---

## Meta: shared opening for every Facebook and Instagram clip

Meta wants **one short video per permission** (about 1 minute each). Every clip starts with this opening, then shows that permission's screen. Record the opening once and copy it to the start of each clip in Clipchamp.

**Before:** in Ispector, disconnect **both** Facebook and Instagram.

1. Open `https://ispector.site` (address bar visible) → **Sign in**.
2. **Settings** → **Connected accounts** → **Connect** next to Facebook (for the Instagram clips, Connect next to Instagram).
3. Facebook login appears; sign in if asked.
4. Meta's dialog lists the permissions and the Pages and business assets. Tick **both** your Page **and** your Instagram account. Hold 3 seconds so the list is readable.
5. Approve. If you manage more than one Page, Ispector shows **"Which Page should we track?"**: pick yours (this is also good footage for `pages_show_list`).
6. Wait for the import. Facebook and Instagram both show as connected in Settings.

End every clip with **Settings** → Disconnect, then open `/data-deletion` for 2 seconds.

## 3. Facebook (one clip per permission)

| Permission | After the opening, show | Caption |
| --- | --- | --- |
| `pages_show_list` | The Pages listed in Meta's dialog (and the "Which Page should we track?" screen if you have several), then the Page name next to Facebook in Settings. | "We list the Pages you manage so you can connect one." |
| `pages_read_engagement` | **Platforms** → Facebook: followers, and reactions and comments on posts. Hover the chart. | "Page followers and engagement on its posts." |
| `pages_read_user_content` | **Content** → Platform menu → **Facebook**. Scroll the Page's posts; open one. | "The Page's published posts, so we can rank them." |
| `read_insights` | **Overview** → "Views per day", hovering the Facebook line; then Platforms → Facebook "Views · 30 days" and "Views per post". **The numbers must be visible.** | "Daily Page views and engagement from Page Insights." |

## 4. Instagram (one clip per permission)

| Permission | After the opening, show | Caption |
| --- | --- | --- |
| `instagram_basic` | Settings showing the Instagram account name; **Content** → Platform menu → **Instagram** (posts and reels). | "The Instagram account and its posts and reels." |
| `instagram_manage_insights` | **Platforms** → Instagram (daily views, interactions), then **Audience** (age, gender, country). **The numbers must be visible.** | "Daily views and interactions, and audience demographics." |
| `business_management` | In the opening, hold on the Meta dialog step that lists the **business** and its assets. Then show Instagram connected in Settings. | "Needed to find the Instagram account linked to a Page inside a business portfolio." |

---

## 5. LinkedIn (Community Management API), later

Record this **only after** LinkedIn grants Development-tier access; the connect step fails before that.

| # | Do | Caption |
| --- | --- | --- |
| 1 | `https://ispector.site` → **Sign in**. | |
| 2 | **Settings** → **Connect** next to LinkedIn. | |
| 3 | LinkedIn's consent screen: hold so the permissions are readable. **Allow**. If you administer several Pages, pick one on "Which Page should we track?". | "We request organization admin read and organization social read." |
| 4 | Settings: the company Page name next to LinkedIn. | "rw_organization_admin: finding the Pages you administer. We only read." |
| 5 | **Platforms** → LinkedIn: followers and impressions. Hover the chart. | "Follower and share statistics." |
| 6 | **Content** → Platform menu → **LinkedIn**: the Page's posts. | "r_organization_social: the Page's posts and their statistics." |
| 7 | **Settings** → **Disconnect** LinkedIn. | |

---

## After recording

- Watch each video once before uploading: the address bar, the consent screen and the data screens must all be readable.
- Blur or crop your personal email if it shows (Clipchamp → Effects → Blur on a cropped overlay, or simply re-record with that screen skipped).
- Keep the raw files: Meta and TikTok often ask for a re-recording of one step rather than the whole video.
