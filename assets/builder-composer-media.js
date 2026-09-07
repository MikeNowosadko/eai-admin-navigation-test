(() => {
  const input = document.getElementById('bdSay');
  const picker = document.getElementById('bdFileInput');
  const chips = document.getElementById('bdAttachments');
  const mic = document.getElementById('bdDictate');
  const status = document.getElementById('bdMediaStatus');
  let files = [];
  const urls = [];
  const message = (text) => { status.textContent = text; status.hidden = !text; };
  function paint() {
    chips.replaceChildren();
    chips.hidden = !files.length;
    files.forEach((file, index) => {
      const chip = document.createElement('span');
      chip.textContent = file.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.onclick = () => { files.splice(index, 1); paint(); };
      chip.append(remove);
      chips.append(chip);
    });
  }
  document.getElementById('bdAttach').onclick = () => picker.click();
  picker.onchange = () => {
    files.push(...picker.files);
    picker.value = '';
    paint();
    message('Files stay in this local prototype. Add a message to send them; document analysis is not connected.');
  };
  window.builderComposerMedia = {
    take() {
      const selected = files.map((file) => {
        const url = URL.createObjectURL(file);
        urls.push(url);
        return { name: file.name, url };
      });
      files = [];
      paint();
      message('');
      return selected;
    },
  };
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;
  let listening = false;
  let original = '';
  if (Speech) {
    recognition = new Speech();
    recognition.lang = navigator.language || 'en-AU';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => {
      listening = true;
      mic.setAttribute('aria-pressed', 'true');
      mic.setAttribute('aria-label', 'Stop dictation');
      message('Listening… Click the microphone to stop.');
    };
    recognition.onresult = (event) => {
      const words = Array.from(event.results, (result) => result[0].transcript).join(' ');
      input.value = [original, words].filter(Boolean).join(' ');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    recognition.onerror = (event) => {
      message(event.error === 'not-allowed' ? 'Microphone access was denied. Allow it in your browser to use dictation.' : 'Dictation is unavailable right now. Please type your message or try again.');
    };
    recognition.onend = () => {
      listening = false;
      mic.setAttribute('aria-pressed', 'false');
      mic.setAttribute('aria-label', 'Start dictation');
      if (status.textContent.startsWith('Listening')) message('Dictation stopped. Review your message before sending.');
    };
  }
  mic.onclick = () => {
    if (!recognition) { message('This browser does not support voice input. Try Chrome, or use your system’s dictation.'); return; }
    if (listening) { recognition.stop(); return; }
    if (input.disabled) { message('Finish the current step before dictating a message.'); return; }
    original = input.value.trim();
    try { recognition.start(); } catch { message('Dictation could not start. Please try again.'); }
  };
  const stop = () => { if (listening) recognition.abort(); };
  document.getElementById('bdSend').addEventListener('click', stop, true);
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) stop(); });
  window.addEventListener('pagehide', () => { stop(); urls.forEach((url) => URL.revokeObjectURL(url)); });
})();
