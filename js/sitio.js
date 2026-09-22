/* =========================================================================
   sitio.js - código propio del sitio (no es del tema)
   1) Altura del encabezado -> variable CSS --alto-header
   2) reCAPTCHA: se carga solo si hay formulario, en español, se ajusta a pantallas angostas
      y avisa al visitante si falta marcar la casilla
   3) Asistente "Venda o Rente" (formulario por pasos)
   4) Botones de compartir del blog
   ========================================================================= */
(function () {
    'use strict';

    /* ---- Configuración de reCAPTCHA (un solo lugar) ---- */
    var RECAPTCHA_SITEKEY = '6Lc9ppAqAAAAAO1lp7Lun0apNAfAhmg6LLlIJ5zT';   /* clave del sitio (pública) */
    var RECAPTCHA_DOMINIOS = ['sipachuca.com'];   /* dominios autorizados en el panel de reCAPTCHA (incluye subdominios como www) */

    /* 1) alto del encabezado */
    function alturaHeader() {
        var nav = document.querySelector('header nav.navbar');
        if (nav) { document.documentElement.style.setProperty('--alto-header', nav.offsetHeight + 'px'); }
    }
    alturaHeader();
    window.addEventListener('resize', alturaHeader);
    window.addEventListener('load', alturaHeader);

    /* 2) reCAPTCHA */
    function cargarRecaptcha() {
        var widgets = document.querySelectorAll('.g-recaptcha');
        if (!widgets.length) { return; }
        var host = location.hostname, autorizado = false, k;
        for (k = 0; k < RECAPTCHA_DOMINIOS.length; k++) { var d = RECAPTCHA_DOMINIOS[k]; if (host === d || host.slice(-(d.length + 1)) === '.' + d) { autorizado = true; } }
        for (k = 0; k < widgets.length; k++) {
            widgets[k].setAttribute('data-sitekey', RECAPTCHA_SITEKEY);
            if (!autorizado) {
                var av = document.createElement('div'); av.className = 'recaptcha-aviso';
                av.textContent = 'Aviso para el administrador (solo se ve fuera de sipachuca.com): la clave de reCAPTCHA no est\u00e1 autorizada para \u00ab' + (host || 'este equipo') + '\u00bb. Agregue ese dominio en la consola de reCAPTCHA o pruebe en sipachuca.com.';
                widgets[k].parentNode.insertBefore(av, widgets[k]);
            }
        }
        var s = document.createElement('script');
        s.src = 'https://www.google.com/recaptcha/api.js?hl=es';
        s.async = true; s.defer = true;
        document.head.appendChild(s);
    }
    function escalarRecaptcha() {
        var lista = document.querySelectorAll('.g-recaptcha');
        for (var i = 0; i < lista.length; i++) {
            var el = lista[i], caja = el.parentElement;
            var disponible = caja ? caja.clientWidth : 304;
            if (!disponible) { continue; }        /* paso oculto del asistente: se ajusta al mostrarse */
            var k = Math.min(1, disponible / 304);
            el.style.transformOrigin = '0 0';
            el.style.transform = k < 1 ? 'scale(' + k.toFixed(3) + ')' : '';
            el.style.height = k < 1 ? Math.ceil(78 * k) + 'px' : '';
        }
    }
    cargarRecaptcha();
    escalarRecaptcha();
    window.addEventListener('resize', escalarRecaptcha);
    window.addEventListener('load', escalarRecaptcha);

    document.addEventListener('click', function (e) {
        var boton = e.target.closest ? e.target.closest('.submit') : null;
        if (!boton) { return; }
        var form = boton.closest('form');
        var widget = form ? form.querySelector('.g-recaptcha') : null;
        if (!widget) { return; }
        var campo = form.querySelector('textarea[name="g-recaptcha-response"]');
        var aviso = form.querySelector('.recaptcha-aviso');
        if (campo && campo.value) {
            widget.classList.remove('is-invalid');
            if (aviso) { aviso.parentNode.removeChild(aviso); }
            return;
        }
        /* sin casilla marcada: no enviar; resaltar también los campos obligatorios vacíos */
        e.preventDefault(); e.stopImmediatePropagation();
        var req = form.querySelectorAll('.required');
        for (var k = 0; k < req.length; k++) {
            var vacio = !req[k].value || (req[k].type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(req[k].value));
            req[k].classList.toggle('is-invalid', vacio);
        }
        widget.classList.add('is-invalid');
        if (!aviso) {
            aviso = document.createElement('div');
            aviso.className = 'recaptcha-aviso';
            widget.parentNode.insertBefore(aviso, widget.nextSibling);
        }
        aviso.textContent = campo
            ? 'Marque la casilla \u201cNo soy un robot\u201d para poder enviar.'
            : 'No se pudo cargar la verificaci\u00f3n reCAPTCHA. Revise su conexi\u00f3n y recargue la p\u00e1gina, o escr\u00edbanos por WhatsApp.';
    }, true);

    /* 3) Asistente por pasos */
    var wiz = document.querySelector('[data-asistente]');
    if (wiz) {
        var pasos = wiz.querySelectorAll('[data-paso]');
        var puntos = wiz.querySelectorAll('[data-punto]');
        var actual = 0;
        var asunto = wiz.querySelector('input[name="asunto"]');
        var wa = wiz.querySelector('[data-wa]');
        var etiquetas = { vender: 'Quiero vender mi propiedad', rentar: 'Quiero rentar mi propiedad', administrar: 'Quiero que me administren mi propiedad' };

        function mostrar(n) {
            actual = n;
            for (var i = 0; i < pasos.length; i++) { pasos[i].hidden = (i !== n); }
            for (var j = 0; j < puntos.length; j++) { puntos[j].classList.toggle('activo', j <= n); }
            escalarRecaptcha();
            var y = wiz.getBoundingClientRect().top + window.pageYOffset - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--alto-header')) || 70) - 10;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        function opcion() { var r = wiz.querySelector('input[name="interes"]:checked'); return r ? r.value : ''; }
        function actualizarOpcion() {
            var o = opcion();
            if (asunto) { asunto.value = 'Sipachuca contacto web - ' + (etiquetas[o] || 'Venda o Rente'); }
            if (wa) { wa.href = 'https://wa.me/527717120650?text=' + encodeURIComponent('Hola, ' + (etiquetas[o] || 'quiero informaci\u00f3n') + '.'); }
            var t = wiz.querySelectorAll('[data-texto-interes]');
            for (var i = 0; i < t.length; i++) { t[i].textContent = o ? (o === 'vender' ? 'vender' : o === 'rentar' ? 'rentar' : 'administrar') : ''; }
        }
        function validarPaso(n) {
            var ok = true, campos = pasos[n].querySelectorAll('[data-req]');
            var aviso = pasos[n].querySelector('.paso-aviso');
            if (n === 0 && !opcion()) { ok = false; }
            for (var i = 0; i < campos.length; i++) {
                var c = campos[i];
                if (!c.value || (c.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(c.value))) { c.classList.add('is-invalid'); ok = false; } else { c.classList.remove('is-invalid'); }
            }
            if (aviso) { aviso.hidden = ok; }
            return ok;
        }
        wiz.addEventListener('change', function (e) {
            if (e.target.name === 'interes') { actualizarOpcion(); var av = pasos[0].querySelector('.paso-aviso'); if (av) { av.hidden = true; } }
        });
        wiz.addEventListener('click', function (e) {
            var sig = e.target.closest('[data-siguiente]'), atr = e.target.closest('[data-atras]'), pick = e.target.closest('[data-elegir]');
            if (pick) {       /* tarjetas de la sección "¿Qué desea hacer?" */
                var val = pick.getAttribute('data-elegir');
                var radio = wiz.querySelector('input[name="interes"][value="' + val + '"]');
                if (radio) { radio.checked = true; actualizarOpcion(); mostrar(1); }
            }
            if (sig) { e.preventDefault(); if (validarPaso(actual)) { mostrar(actual + 1); } }
            if (atr) { e.preventDefault(); mostrar(actual - 1); }
        });
        /* botones fuera del asistente que preseleccionan la opción */
        document.addEventListener('click', function (e) {
            var pick = e.target.closest('[data-elegir-fuera]');
            if (!pick) { return; }
            var radio = wiz.querySelector('input[name="interes"][value="' + pick.getAttribute('data-elegir-fuera') + '"]');
            if (radio) { radio.checked = true; actualizarOpcion(); mostrar(1); }
        });
        /* al enviarse con éxito, regresar al paso 1 */
        if (window.jQuery) {
            window.jQuery(document).ajaxSuccess(function () {
                setTimeout(function () { for (var i = 0; i < pasos.length; i++) { pasos[i].hidden = (i !== 0); } for (var j = 0; j < puntos.length; j++) { puntos[j].classList.toggle('activo', j === 0); } actual = 0; }, 4500);
            });
        }
        actualizarOpcion();
        var previa = (location.hash.match(/opcion=(vender|rentar|administrar)/) || [])[1];
        if (previa) { var rr = wiz.querySelector('input[name="interes"][value="' + previa + '"]'); if (rr) { rr.checked = true; actualizarOpcion(); } }
    }

    /* 4) Compartir (blog) */
    document.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-compartir]') : null;
        if (!b) { return; }
        var url = location.href, titulo = document.title;
        var tipo = b.getAttribute('data-compartir');
        if (tipo === 'wa') { window.open('https://wa.me/?text=' + encodeURIComponent(titulo + ' ' + url), '_blank', 'noopener'); }
        else if (tipo === 'fb') { window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener'); }
        else if (tipo === 'copiar') {
            if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { b.setAttribute('data-copiado', '1'); b.querySelector('span').textContent = '\u00a1Enlace copiado!'; }); }
        } else if (navigator.share) { navigator.share({ title: titulo, url: url }); }
    });

    /* 7) WhatsApp de las p\u00e1ginas de detalle: el mensaje lleva el enlace de la p\u00e1gina en la que est\u00e1 el visitante */
    (function () {
        if (location.protocol === 'file:') { return; }
        var texto = 'Hola, estoy en su p\u00e1gina y quiero informaci\u00f3n sobre: ' + location.href.split('#')[0];
        var lista = document.querySelectorAll('a[data-wa-pagina]');
        for (var i = 0; i < lista.length; i++) { lista[i].href = 'https://wa.me/527717120650?text=' + encodeURIComponent(texto); }
    })();

    /* 5a) Tarjetas: se oculta la celda de dato que esté vacía */
    (function () {
        var celdas = document.querySelectorAll('.datos-tarjeta > .col');
        for (var i = 0; i < celdas.length; i++) { if (!celdas[i].children.length) { celdas[i].classList.add('vacio'); } }
    })();

    /* 5) Casas rentadas: se muestran por lotes para no cargar cientos de fotos de golpe */
    (function () {
        var grids = document.querySelectorAll('[data-mostrar-mas]');
        for (var g = 0; g < grids.length; g++) {
            (function (grid) {
                var items = grid.querySelectorAll('.rentada-item');
                var inicial = parseInt(grid.getAttribute('data-inicial'), 10) || 24;
                var lote = parseInt(grid.getAttribute('data-lote'), 10) || 36;
                var caja = grid.parentNode;
                var boton = caja.querySelector('[data-mas-boton]'), info = caja.querySelector('[data-mas-info]');
                if (!boton || items.length <= inicial) { return; }
                var visibles = inicial;
                for (var i = inicial; i < items.length; i++) { items[i].hidden = true; }
                function pintar() {
                    if (info) { info.textContent = 'Mostrando ' + Math.min(visibles, items.length) + ' de ' + items.length; }
                    boton.hidden = visibles >= items.length;
                }
                boton.addEventListener('click', function () {
                    var hasta = Math.min(visibles + lote, items.length);
                    for (var i = visibles; i < hasta; i++) { items[i].hidden = false; }
                    visibles = hasta; pintar();
                });
                pintar();
            })(grids[g]);
        }
    })();

    /* 6) Si una foto de una tarjeta o de las casas rentadas no carga, se pone una imagen neutra */
    document.addEventListener('error', function (e) {
        var t = e.target;
        if (t && t.tagName === 'IMG' && !t.getAttribute('data-sin-foto') && t.closest && (t.closest('.rentada-item') || t.closest('.js-tarjeta'))) {
            t.setAttribute('data-sin-foto', '1');
            t.src = 'img/600x415.png';
        }
    }, true);
})();
