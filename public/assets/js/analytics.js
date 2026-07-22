// Google Analytics 4 (GA4) initialization for ICAS Lucknow Chapter.
// Kept in an external file rather than inline in every page's <head> - an
// inline <script> block would need its own CSP hash (like the JSON-LD and
// font-loading scripts elsewhere in this project), which is fragile for
// third-party tracking code that Google could change the exact wording of
// without notice. As an external file under /assets/js, it's automatically
// covered by the existing script-src 'self' policy with zero extra CSP
// maintenance.
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-JFHH68KFB8');
