(function () {
  if (window.PizzariaIAWidgetLoaded) return;
  window.PizzariaIAWidgetLoaded = true;

  const script = document.createElement('script');
  script.src = 'http://localhost:3000/static/js/embed.bundle.js';
  script.async = true;
  document.head.appendChild(script);
})();