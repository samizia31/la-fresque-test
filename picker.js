/* La Fresque — import d'image (logo / photo) pour le web, iOS compris.
   iOS exige que input.click() soit appelé PENDANT un geste : si Godot demande hors geste,
   on « arme » et on ouvre au prochain pointerup/touchend. L'image est réduite (≤1024 px) dans
   un canvas et renvoyée en PNG base64 (gère aussi HEIC : Safari le décode lui-même). */
(function () {
  var input = null, pending = null, armed = false;
  function done(b64, info) { var cb = pending; pending = null; if (cb) { try { cb(b64, info); } catch (e) {} } }
  function read(f) {
    var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, 1024 / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var d = c.toDataURL('image/png');
      done(d.slice(d.indexOf(',') + 1), (f.type || 'image') + ' ' + w + 'x' + h);
    };
    img.onerror = function () { URL.revokeObjectURL(url); done('', 'decode_error'); };
    img.src = url;
  }
  function ensure() {
    if (input) return input;
    input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0]; input.value = '';
      if (!f) { done('', 'cancel'); return; }
      read(f);
    });
    input.addEventListener('cancel', function () { done('', 'cancel'); });
    document.body.appendChild(input);
    return input;
  }
  function open() { armed = false; ensure().click(); }
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (t) {
    document.addEventListener(t, function () { if (armed && pending) open(); }, { capture: true });
  });
  window.__fresquePick = {
    request: function (cb) {
      pending = cb;
      var ua = navigator.userActivation;
      if (ua && ua.isActive) { try { open(); return 'opened'; } catch (e) {} }
      armed = true; return 'armed';
    },
    // QA : injecter une image sans sélecteur (base64 PNG)
    inject: function (b64) { done(b64, 'inject'); }
  };
})();
