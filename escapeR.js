const MODULE_ID = "escapeR";

/**
 * Predefined window classes for convenience.
 */
const AVAILABLE_CLASSES = {
  "camera-view": "Camera Popouts",
  "actor-sheet": "Actor Sheets",
  "journal-sheet": "Journal Sheets",
  "playlist": "Playlists",
  "combat-tracker": "Combat Tracker"
};

Hooks.once("init", () => {
  // Store selected + custom classes
  game.settings.register(MODULE_ID, "protectedClasses", {
    scope: "client",
    config: false,
    type: Object,
    default: {
      selected: ["camera-view"], // defaults
      custom: []                 // additional user-entered
    }
  });

  // Settings menu
  game.settings.registerMenu(MODULE_ID, "protectedClassesMenu", {
    name: "Protected Windows",
    label: "Configure Protected Windows",
    hint: "Choose which windows should ignore Escape.",
    icon: "fas fa-window-maximize",
    type: IgnoreEscConfig,
    restricted: false
  });
});

Hooks.once("ready", () => {
  const libWrapper = globalThis.libWrapper;

  // Wrapper function that will be used regardless of the registration method
  async function closeWrapper(wrapped, ...args) {
    const options = args[0] ?? {};
    if (options.closeKey) {
      const { selected = [], custom = [] } =
        game.settings.get(MODULE_ID, "protectedClasses") || {};
      const protectedClasses = [
        ...new Set([
          ...selected,
          ...custom.map(c => c.trim()).filter(Boolean)
        ])
      ];

      const el = this.element ?? null;
      if (el?.classList) {
        for (const cls of protectedClasses) {
          if (el.classList.contains(cls)) {
            console.log(`Ignored ESC for ${cls}`, this);
            return; // block the close
          }
        }
      }
    }
    return wrapped(...args);
  }

  if (libWrapper) {
    // Try several possible libWrapper paths for the ApplicationV2 class
    const libPaths = [
      "ApplicationV2.prototype.close",
      "foundry.applications.api.ApplicationV2.prototype.close",
      "CONFIG.ApplicationV2.prototype.close"
    ];
    let registered = false;
    for (const path of libPaths) {
      try {
        libWrapper.register(MODULE_ID, path, closeWrapper);
        registered = true;
        console.log(`escapeR – registered via libWrapper using path "${path}"`);
        break;
      } catch (e) {
        if (e.message && e.message.includes("Could not find root scope")) {
          continue;
        }
        throw e;
      }
    }
    if (registered) {
      console.log("✅ Ignore-ESC active (libWrapper). ESC ignored for configured windows.");
      return;
    }
    // If none of the paths worked libWrapper cannot locate ApplicationV2
  } else {
    ui.notifications.error(
      "escapeR: libWrapper is required for this module to work. Please install and enable libWrapper."
    );
  }

  // ----- Fallback: manual override when libWrapper cannot be used -----
  const AppV2 =
    globalThis.ApplicationV2 ??
    globalThis.foundry?.applications?.api?.ApplicationV2 ??
    null;
  if (!AppV2) {
    ui.notifications.error(
      "escapeR: Could not locate ApplicationV2. The module cannot protect windows."
    );
    return;
  }

  const origClose = AppV2.prototype.close;
  AppV2.prototype.close = async function (options) {
    const opts = options ?? {};
    if (opts.closeKey) {
      const { selected = [], custom = [] } =
        game.settings.get(MODULE_ID, "protectedClasses") || {};
      const protectedClasses = [
        ...new Set([
          ...selected,
          ...custom.map(c => c.trim()).filter(Boolean)
        ])
      ];

      const el = this.element ?? null;
      if (el?.classList) {
        for (const cls of protectedClasses) {
          if (el.classList.contains(cls)) {
            console.log(`Ignored ESC for ${cls}`, this);
            return; // block the close
          }
        }
      }
    }
    return origClose.call(this, options);
  };

  console.log("✅ Ignore-ESC active (manual override). ESC ignored for configured windows.");
});

/**
 * Custom settings form
 */
class IgnoreEscConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "ignore-esc-config",
      title: "Ignore Escape – Protected Windows",
      template: `
        <form>
          <div class="form-group">
            <p><strong>Common Windows</strong> – tick which to protect:</p>
            {{#each classes}}
              <div>
                <label>
                  <input type="checkbox" name="selected" value="{{@key}}" {{checked}}>
                  {{label}}
                </label>
              </div>
            {{/each}}
          </div>

          <div class="form-group">
            <p><strong>Custom Classes</strong> – add extra class names (comma separated):</p>
            <input type="text" name="custom" value="{{customStr}}" placeholder="e.g. my-module-sheet, cool-window">
            <p class="notes">These should match CSS classes on the window’s root <code>&lt;div class="application ..."&gt;</code>.</p>
          </div>

          <footer class="sheet-footer flexrow">
            <button type="submit"><i class="far fa-save"></i> Save</button>
          </footer>
        </form>
      `,
      width: 400
    });
  }

  getData() {
    const { selected = [], custom = [] } =
      game.settings.get(MODULE_ID, "protectedClasses") || {};
    return {
      classes: Object.fromEntries(
        Object.entries(AVAILABLE_CLASSES).map(([key, label]) => [
          key,
          { label, checked: selected.includes(key) ? "checked" : "" }
        ])
      ),
      customStr: custom.join(", ")
    };
  }

  async _updateObject(_event, formData) {
    const selected = Array.isArray(formData.selected)
      ? formData.selected
      : [formData.selected].filter(Boolean);
    const custom = formData.custom
      ? formData.custom.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    await game.settings.set(MODULE_ID, "protectedClasses", { selected, custom });
    ui.notifications.info("Ignore-ESC: settings updated");
  }
}
