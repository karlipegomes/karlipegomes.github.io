/*
 * Carrega o Disqus somente após consentimento explícito do cookie "disqus"
 * (mkdocs-material consent -> cookie __consent).
 *
 * Este arquivo é servido via extra_javascript, que o Material injeta DEPOIS do
 * bundle.js, então __md_get e document$ já existem aqui.
 */

const DISQUS_SHORTNAME = "karlipegomes"

function disqusConsentGranted() {
  try {
    const consent = __md_get("__consent")
    return !!(consent && consent.disqus)
  } catch (err) {
    return false
  }
}

function loadDisqus() {
  // O Disqus só pode ser embutido uma vez por page load; em navegações
  // subsequentes (navigation.instant) usamos DISQUS.reset.
  window.disqus_config = function () {
    this.page.url = window.location.href
    this.page.identifier = window.location.pathname
  }

  if (window.DISQUS) {
    window.DISQUS.reset({
      reload: true,
      config: window.disqus_config
    })
    return
  }

  const script = document.createElement("script")
  script.src = "https://" + DISQUS_SHORTNAME + ".disqus.com/embed.js"
  script.setAttribute("data-timestamp", +new Date())
  document.head.appendChild(script)
}

function renderPlaceholder(container) {
  const notice = document.createElement("div")
  notice.className = "md-typeset disqus-consent-notice"
  notice.innerHTML =
    "<p>Comments are powered by Disqus, which sets third-party cookies. " +
    "Accept the <strong>Disqus</strong> cookie in the consent settings to load them.</p>"
  container.appendChild(notice)
}

document$.subscribe(function () {
  const thread = document.getElementById("disqus_thread")
  if (!thread) return

  thread.innerHTML = ""

  if (disqusConsentGranted()) {
    loadDisqus()
  } else {
    renderPlaceholder(thread)
  }
})
