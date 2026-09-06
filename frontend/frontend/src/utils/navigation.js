/**
 * Safely handles back button navigation.
 * If the user opened the page directly from a shared link (no previous history in app),
 * it navigates to the fallback path (default Home '/').
 */
export function goBack(navigate, fallbackPath = '/') {
  if (typeof window !== 'undefined' && window.history && window.history.state && window.history.state.idx > 0) {
    navigate(-1);
  } else {
    navigate(fallbackPath, { replace: true });
  }
}
