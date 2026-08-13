/* ------------------------------------------------------------------
   EAI Setup app flow.

   Where the npx flow hands you a command, this one hands you an app:
   download from the site → the disk image opens → drag it to Applications
   → open it from the dock. Sign-in is where the defined flow currently
   stops.
------------------------------------------------------------------- */

const dmgWin = document.getElementById('winDmg');
const dmgApp = document.getElementById('dmgApp');
const dmgTarget = document.getElementById('dmgApplications');
const dmgHint = document.getElementById('dmgHint');

let installed = false;

/* A finished download opens the disk image, the way Safari does. */
setDownloadHandler(() => {
  setTimeout(() => {
    resetDmg();
    focusWin('dmg');
  }, 420);
  return 'handled';
});

function resetDmg() {
  installed = false;
  dmgApp.style.transform = '';
  dmgApp.hidden = false;
  dmgTarget.classList.remove('over', 'filled');
  dmgHint.textContent = 'Drag EAI Setup onto the Applications folder — or double-click it.';
}

/** Copy to Applications: the app appears in the dock, the image ejects. */
function install() {
  if (installed) return;
  installed = true;
  dmgApp.hidden = true;
  dmgTarget.classList.add('filled');
  dmgHint.textContent = 'Copied to Applications.';

  const item = dockItem('setup');
  item.classList.remove('tucked');
  item.classList.add('landing');
  setTimeout(() => item.classList.remove('landing'), 600);
  syncDock();

  setTimeout(() => hideWin('dmg'), 900);
}

/* Drag the app icon onto the Applications folder. */
dmgApp.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const start = { x: e.clientX, y: e.clientY };
  let moved = false;

  const move = (ev) => {
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    moved = true;
    dmgApp.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
    const over = hitTest(ev.clientX, ev.clientY, dmgTarget);
    dmgTarget.classList.toggle('over', over);
  };

  const up = (ev) => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    if (moved && hitTest(ev.clientX, ev.clientY, dmgTarget)) {
      install();
    } else {
      dmgApp.style.transform = '';
      dmgTarget.classList.remove('over');
    }
  };

  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
});

// Double-click installs too — dragging is fiddly and this is a prototype.
dmgApp.addEventListener('dblclick', install);
dmgTarget.addEventListener('dblclick', install);

function hitTest(x, y, el) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
