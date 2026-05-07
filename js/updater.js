// In-app update check. Visible status in the banner so failures don't hide
// silently. Tries the in-app installer first (window.updater from preload),
// falls back to opening the release page in the browser.

(() => {
  const banner = document.getElementById("update-banner");
  const label = document.getElementById("update-label");
  const dismiss = document.getElementById("update-dismiss");
  const versionEl = document.getElementById("app-version");

  if (versionEl) {
    versionEl.textContent = window.BUILD_VERSION ? "v" + window.BUILD_VERSION : "dev";
  }
  if (!banner || !label) return;

  let dismissed = false;
  if (dismiss) {
    dismiss.addEventListener("click", () => {
      banner.classList.add("hidden");
      dismissed = true;
    });
  }

  // Replace the link node every time we change behavior so prior click
  // handlers don't stack up.
  function show(msg, action) {
    if (dismissed) return;
    label.textContent = msg;
    const oldLink = document.getElementById("update-link");
    const link = oldLink.cloneNode(false);
    link.id = "update-link";
    link.textContent = "";
    link.removeAttribute("target");
    link.removeAttribute("href");
    link.style.display = "none";
    oldLink.parentNode.replaceChild(link, oldLink);

    if (action) {
      link.style.display = "";
      link.textContent = action.text;
      if (action.href) link.href = action.href;
      else link.href = "#";
      if (action.target) link.target = action.target;
      if (action.onClick) link.addEventListener("click", action.onClick);
    }
    banner.classList.remove("hidden");
    if (action && action.autoHide) {
      setTimeout(() => {
        if (!dismissed) banner.classList.add("hidden");
      }, action.autoHide);
    }
  }

  if (!window.BUILD_VERSION) {
    show("Dev build — auto-update disabled", { autoHide: 3000 });
    return;
  }

  show("v" + window.BUILD_VERSION + " — checking for updates…");

  const REPO = "mwp12490/chessopenings";
  fetch("https://api.github.com/repos/" + REPO + "/releases/latest", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("API HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      const latest = (data.tag_name || "").replace(/^v/, "");
      if (!latest) {
        show("v" + window.BUILD_VERSION + " — no release info from GitHub", { autoHide: 5000 });
        return;
      }
      if (latest === window.BUILD_VERSION) {
        show("v" + window.BUILD_VERSION + " — up to date", { autoHide: 2500 });
        return;
      }
      const dmgAsset = (data.assets || []).find((a) => /\.dmg$/i.test(a.name || ""));
      const dmgUrl = dmgAsset ? dmgAsset.browser_download_url : null;
      const canInstall = !!(dmgUrl && window.updater && window.updater.install);

      if (canInstall) {
        show("New version available (v" + latest + ")", {
          text: "Install & Restart",
          onClick: async (e) => {
            e.preventDefault();
            const lk = document.getElementById("update-link");
            lk.style.pointerEvents = "none";
            lk.style.opacity = "0.6";
            if (window.updater.onProgress) {
              window.updater.onProgress((msg) => { label.textContent = msg; });
            }
            try {
              await window.updater.install(dmgUrl);
            } catch (err) {
              label.textContent = "Install failed: " + (err && err.message ? err.message : err) + " — opening download page…";
              lk.style.pointerEvents = "";
              lk.style.opacity = "";
              lk.textContent = "Open page";
              lk.href = data.html_url;
              lk.target = "_blank";
            }
          }
        });
      } else {
        show("New version available (v" + latest + ")", {
          text: "Open page",
          href: data.html_url,
          target: "_blank"
        });
      }
    })
    .catch((err) => {
      show("v" + window.BUILD_VERSION + " — update check failed: " + (err && err.message ? err.message : err), { autoHide: 8000 });
    });
})();
