// Auth guard — include on every protected page.
// Redirects to /auth.html if no session found.
(function () {
  const session = localStorage.getItem('reserc_session');
  if (!session) {
    window.location.replace('/auth.html?next=' + encodeURIComponent(location.pathname));
  }
})();
