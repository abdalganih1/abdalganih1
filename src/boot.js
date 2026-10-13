// Runs in <head> before paint: sets flags used by CSS initial animation states.
(function (d) {
  var h = d.documentElement, rm = false, seen = false;
  try { rm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  try { seen = sessionStorage.getItem('ag-intro') === '1'; } catch (e) {}
  h.classList.add('js');
  if (rm) h.classList.add('rm');
  if (/[?&]intro\b/.test(location.search)) seen = false;
  if (seen || rm || !d.querySelector) h.classList.add('no-loader');
  try { if (sessionStorage.getItem('ag-nav') === '1') { h.classList.add('entering'); sessionStorage.removeItem('ag-nav'); } } catch (e) {}
  // Safety net: never leave content hidden if the main script fails to run.
  setTimeout(function () { if (!h.classList.contains('booted')) h.classList.remove('js', 'entering'); }, 5000);
})(document);
