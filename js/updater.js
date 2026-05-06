// In-app update check.
// Skips entirely unless the build embedded a version (CI builds only — npm start runs leave it null).
// Pings GitHub's Releases API; if the latest tag differs from this build, shows the banner.
// When the Electron preload's `window.updater` API is present, the banner installs
// the update in-place; otherwise it falls back to opening the release page in the browser.

(() => {
  if (!window.BUILD_VERSION) return;

  const REPO = "mwp12490/chessopenings";
  const API_URL = "https://api.github.com/repos/" + REPO + "/releases/latest";

  function showBanner(latestVersion, releaseUrl, dmgUrl) {
    const banner = document.getElementById("update-banner");
    const label = document.getElementById("update-label");
    const link = document.getElementById("update-link");
    if (!banner || !label || !link) return;

    label.textContent = "New version available (v" + latestVersion + ")";

    const canInstall = !!(dmgUrl && window.updater && window.updater.install);

    if (canInstall) {
      link.textContent = "Install & Restart";
      link.href = "#";
      link.addEventListener("click", async (e) => {
        e.preventDefault();
        link.style.pointerEvents = "none";
        link.style.opacity = "0.6";
        let unsub = null;
        if (window.updater.onProgress) {
          unsub = window.updater.onProgress((msg) => { label.textContent = msg; });
        }
        try {
          await window.updater.install(dmgUrl);
          // The app will quit and the installer script relaunches.
        } catch (err) {
          if (unsub) unsub();
          label.textContent = "Update failed — opening download page…";
          link.style.pointerEvents = "";
          link.style.opacity = "";
          link.textContent = "Open page";
          link.href = releaseUrl;
          // Force the next click to actually navigate.
          link.target = "_blank";
        }
      });
    } else {
      link.textContent = "Download";
      link.href = releaseUrl;
    }

    banner.classList.remove("hidden");

    const dismiss = document.getElementById("update-dismiss");
    if (dismiss) {
      dismiss.addEventListener("click", () => banner.classList.add("hidden"), { once: true });
    }
  }

  async function check() {
    try {
      const r = await fetch(API_URL, { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      const latest = (data.tag_name || "").replace(/^v/, "");
      if (!latest || latest === window.BUILD_VERSION) return;
      const dmgAsset = (data.assets || []).find(a => /\.dmg$/i.test(a.name || ""));
      const dmgUrl = dmgAsset ? dmgAsset.browser_download_url : null;
      showBanner(latest, data.html_url, dmgUrl);
    } catch (e) {
      // Offline or API hiccup — silently skip.
    }
  }

  setTimeout(check, 1500);
})();
