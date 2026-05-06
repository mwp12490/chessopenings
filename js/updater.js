// In-app update check.
// Skips entirely unless the build embedded a version (CI builds only — npm start runs leave it null).
// Pings GitHub's Releases API; if the latest tag differs from this build, shows the banner.

(() => {
  if (!window.BUILD_VERSION) return;

  const REPO = "mwp12490/chessopenings";
  const API_URL = "https://api.github.com/repos/" + REPO + "/releases/latest";

  function showBanner(latestVersion, releaseUrl) {
    const banner = document.getElementById("update-banner");
    if (!banner) return;
    const label = document.getElementById("update-label");
    const link = document.getElementById("update-link");
    if (label) label.textContent = "New version available (v" + latestVersion + ")";
    if (link) link.href = releaseUrl;
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
      if (latest && latest !== window.BUILD_VERSION) {
        showBanner(latest, data.html_url);
      }
    } catch (e) {
      // Offline or API hiccup — silently skip.
    }
  }

  setTimeout(check, 1500);
})();
