(() => {
  const q = (s, r=document) => r.querySelector(s);
  document.addEventListener('DOMContentLoaded', () => {
    const globalToggle = q('#globalToggle');
    const providerToggle = q('#provider-chatgpt-toggle');
    const claudeToggle = q('#provider-claude-toggle');
    const deepseekToggle = q('#provider-deepseek-toggle');
    const geminiToggle = q('#provider-gemini-toggle');
    if (!globalToggle || !providerToggle || !claudeToggle || !deepseekToggle || !geminiToggle) return;

    const applyGlobal = (val) => {
      globalToggle.checked = !!val;
      document.body.classList.toggle('global-off', !val);
      providerToggle.disabled = !val;
      claudeToggle.disabled = !val;
      deepseekToggle.disabled = !val;
      geminiToggle.disabled = !val;
    };
    const applyProvider = (val) => {
      providerToggle.checked = !!val;
    };
    const applyClaude = (val) => {
      claudeToggle.checked = !!val;
    };
    const applyDeepseek = (val) => {
      deepseekToggle.checked = !!val;
    };
    const applyGemini = (val) => {
      geminiToggle.checked = !!val;
    };

    // Read stored state (new keys only)
    try {
      chrome.storage.local.get({ timelineActive: true, timelineProviders: {} }, (res) => {
        const active = !!res.timelineActive;
        const chatgptVal = (res.timelineProviders && typeof res.timelineProviders.chatgpt === 'boolean') ? !!res.timelineProviders.chatgpt : true;
        const claudeVal = (res.timelineProviders && typeof res.timelineProviders.claude === 'boolean') ? !!res.timelineProviders.claude : true;
        const deepseekVal = (res.timelineProviders && typeof res.timelineProviders.deepseek === 'boolean') ? !!res.timelineProviders.deepseek : true;
        const geminiVal = (res.timelineProviders && typeof res.timelineProviders.gemini === 'boolean') ? !!res.timelineProviders.gemini : true;
        applyGlobal(active);
        applyProvider(chatgptVal);
        applyClaude(claudeVal);
        applyDeepseek(deepseekVal);
        applyGemini(geminiVal);
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
      claudeToggle.disabled = !enabled;
      deepseekToggle.disabled = !enabled;
      geminiToggle.disabled = !enabled;
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

    claudeToggle.addEventListener('change', () => {
      const enabled = !!claudeToggle.checked;
      try {
        chrome.storage.local.get({ timelineProviders: {} }, (res) => {
          const map = res.timelineProviders || {};
          map.claude = enabled;
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
  });
})();
