(() => {
  const q = (s, r=document) => r.querySelector(s);
  document.addEventListener('DOMContentLoaded', () => {
    const globalToggle = q('#globalToggle');
    const providerToggle = q('#provider-chatgpt-toggle');
    const deepseekToggle = q('#provider-deepseek-toggle');
    const geminiToggle = q('#provider-gemini-toggle');
    const copilotToggle = q('#provider-copilot-toggle');
    if (!globalToggle || !providerToggle || !deepseekToggle || !geminiToggle || !copilotToggle) return;

    const applyGlobal = (val) => {
      globalToggle.checked = !!val;
      document.body.classList.toggle('global-off', !val);
      providerToggle.disabled = !val;
      deepseekToggle.disabled = !val;
      geminiToggle.disabled = !val;
      copilotToggle.disabled = !val;
    };
    const applyProvider = (val) => {
      providerToggle.checked = !!val;
    };
    const applyDeepseek = (val) => {
      deepseekToggle.checked = !!val;
    };
    const applyGemini = (val) => {
      geminiToggle.checked = !!val;
    };
    const applyCopilot = (val) => {
      copilotToggle.checked = !!val;
    };

    // Read stored state (new keys only)
    try {
      chrome.storage.local.get({ timelineActive: true, timelineProviders: {} }, (res) => {
        const active = !!res.timelineActive;
        const chatgptVal = (res.timelineProviders && typeof res.timelineProviders.chatgpt === 'boolean') ? !!res.timelineProviders.chatgpt : true;
        const deepseekVal = (res.timelineProviders && typeof res.timelineProviders.deepseek === 'boolean') ? !!res.timelineProviders.deepseek : true;
        const geminiVal = (res.timelineProviders && typeof res.timelineProviders.gemini === 'boolean') ? !!res.timelineProviders.gemini : true;
        const copilotVal = (res.timelineProviders && typeof res.timelineProviders.copilot === 'boolean') ? !!res.timelineProviders.copilot : true;
        applyGlobal(active);
        applyProvider(chatgptVal);
        applyDeepseek(deepseekVal);
        applyGemini(geminiVal);
        applyCopilot(copilotVal);
        // Re-enable transitions after initial state is applied and painted
        requestAnimationFrame(() => { requestAnimationFrame(() => { try { document.body.classList.remove('boot'); } catch {} }); });
      });
    } catch {}

    // Write on change
    globalToggle.addEventListener('change', () => {
      const enabled = !!globalToggle.checked;
      try { chrome.storage.local.set({ timelineActive: enabled }); } catch {}
      document.body.classList.toggle('global-off', !enabled);
      providerToggle.disabled = !enabled;
      deepseekToggle.disabled = !enabled;
      geminiToggle.disabled = !enabled;
      copilotToggle.disabled = !enabled;
    });

    providerToggle.addEventListener('change', () => {
      const enabled = !!providerToggle.checked;
      try {
        chrome.storage.local.get({ timelineProviders: {} }, (res) => {
          const map = res.timelineProviders || {};
          map.chatgpt = enabled;
          try { chrome.storage.local.set({ timelineProviders: map }); } catch {}
        });
      } catch {}
    });

    deepseekToggle.addEventListener('change', () => {
      const enabled = !!deepseekToggle.checked;
      try {
        chrome.storage.local.get({ timelineProviders: {} }, (res) => {
          const map = res.timelineProviders || {};
          map.deepseek = enabled;
          try { chrome.storage.local.set({ timelineProviders: map }); } catch {}
        });
      } catch {}
    });

    geminiToggle.addEventListener('change', () => {
      const enabled = !!geminiToggle.checked;
      try {
        chrome.storage.local.get({ timelineProviders: {} }, (res) => {
          const map = res.timelineProviders || {};
          map.gemini = enabled;
          try { chrome.storage.local.set({ timelineProviders: map }); } catch {}
        });
      } catch {}
    });

    copilotToggle.addEventListener('change', () => {
      const enabled = !!copilotToggle.checked;
      try {
        chrome.storage.local.get({ timelineProviders: {} }, (res) => {
          const map = res.timelineProviders || {};
          map.copilot = enabled;
          try { chrome.storage.local.set({ timelineProviders: map }); } catch {}
        });
      } catch {}
    });
  });
})();
