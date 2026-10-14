# X (Twitter) Ultrawide & Aspect Ratio Fix — Violentmonkey Userscript

A high-performance Violentmonkey userscript designed to eliminate letterboxing, vastly enlarge Twitter's middle timeline (up to 1350px, 1600px, or 100% Fluid Stretch), fix media aspect ratios, and optimize the layout for ultrawide and high-DPI displays (specifically tuned for **2880x1800 @ 1.33x scaling on Brave / Fedora Linux**).

---

## 🌟 Problems Solved

1. **Vastly Enlarged Central Timeline**:
   * Default Twitter clamps the feed to only **600px**, which looks tiny on a 2880×1800 screen.
   * Version 2.0.0 defaults the timeline to **1350px (Large)**, with one-click presets for **1600px (Ultrawide)** and **100% (Full Fluid Stretch)**.
   * Forces all inner containers, tweet cells (`cellInnerDiv`), tweets, and media cards to expand across the full width.

2. **Overriding Twitter's Hardcoded Inline Wrappers**:
   * Overrides Twitter's React wrapper inline styles (`width: 1050px;`, `width: 990px;`) that previously restricted primary column expansion.
   * Includes an active `MutationObserver` DOM enforcer so infinite scrolling and React re-renders cannot revert the layout back to 600px.

3. **Media Aspect Ratio & Letterboxing Artifacts**:
   * Eliminates black bars on photos and video players.
   * Images and videos scale cleanly to the wider column without blowing past screen height (`max-height: 80vh`, adjustable).

4. **Action Bar Formatting**:
   * Spreads reply, repost, like, and bookmark buttons evenly across the full width of the enlarged tweet card.

5. **Quick Sidebar Toggle**:
   * Press **`Alt + S`** anytime to instantly hide or show the right sidebar (Trends & Who to Follow), giving 100% of the screen space to your timeline.

---

## 🚀 How to Install / Update in Violentmonkey (Brave on Fedora 44)

1. **Open Violentmonkey**:
   * Click the Violentmonkey icon in Brave's toolbar.
   * Open the Violentmonkey Dashboard (or click the existing script to edit it).

2. **Paste the Script**:
   * Open [`x-ultrawide-aspect-ratio-fix.user.js`](file:///home/herbe/Projects/violentmonkey-x-fix-interface/x-ultrawide-aspect-ratio-fix.user.js).
   * Copy the entire code.
   * Paste it into the editor (replacing previous code).

3. **Save**:
   * Press **`Ctrl + S`** (or click **Save & Close**).

4. **Refresh Twitter/X**:
   * Refresh [x.com](https://x.com) or [twitter.com](https://twitter.com).
   * The timeline will immediately expand to **1350px**.

---

## ⌨️ Shortcuts & Controls

| Shortcut / Control | Action |
| :--- | :--- |
| **`Alt + W`** | Open / close the in-page **Settings Dialog** |
| **`Alt + S`** | Instantly toggle the **Right Sidebar** (Trends & Follows) |
| **Floating Blue Icon** | Click the monitor icon in the bottom-right corner to open Settings |
| **Violentmonkey Menu** | Open Violentmonkey from the toolbar to access `Configure X Ultrawide Layout` |

---

## ⚙️ Timeline Width Presets

Open the settings panel (**`Alt + W`**) to choose your preferred width:

* **Default (600px)**: Original narrow Twitter feed.
* **Wide (1000px)**: Moderate widescreen feed.
* **Large (1350px)** *(Default)*: Optimized for 2880×1800 @ 1.33x — generous, comfortable reading width that fills the middle without wasted side space.
* **Ultra (1600px)**: Extra-large timeline for ultrawide monitors.
* **Stretch (100%)**: Fluid layout that stretches to use the entire screen width.
* **Custom Slider**: Range from `500px` to `2200px` for pixel-perfect adjustments
