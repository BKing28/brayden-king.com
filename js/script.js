(function () {
  'use strict';

  function initMobileMenu() {
    var toggle = document.querySelector('.nav__toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      menu.classList.toggle('open');
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('open');
        menu.classList.remove('open');
      });
    });
  }

  function setActiveNav() {
    var path = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
    document.querySelectorAll('.nav__link').forEach(function (link) {
      var href = link.getAttribute('href').replace('.html', '');
      if (href === path || (path === '' && href === 'index')) {
        link.classList.add('nav__link--active');
      }
    });
  }

  function initProjects() {
    document.querySelectorAll('.project-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var wasActive = item.classList.contains('active');
        document.querySelectorAll('.project-item').forEach(function (i) { i.classList.remove('active'); });
        if (!wasActive) item.classList.add('active');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setActiveNav();
    initMobileMenu();
    initProjects();
  });
})();
