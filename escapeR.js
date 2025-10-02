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
  const AppV2 = foundry?.applications?.api?.ApplicationV2 ?? window.ApplicationV2;
  if (!AppV2) {
    console.error(`${MODULE_ID}: ApplicationV2 not found`);
    return;
  }
  if (AppV2.prototype.__ignoreEscPatched) return;

  const orig = AppV2.prototype.close;
  AppV2.prototype.close = async function (options = {}) {
    if (options?.closeKey) {
      const { selected = [], custom = [] } = game.settings.get(MODULE_ID, "protectedClasses") || {};
      const protectedClasses = [...new Set([...selected, ...custom.map(c => c.trim()).filter(Boolean)])];

      const el = this.element ?? null;
      if (el?.classList) {
        for (const cls of protectedClasses) {
          if (el.classList.contains(cls)) {
            console.log(`🚫 [Ignore-ESC] Ignored ESC for ${cls}`, this);
            return this;
          }
        }
      }
    }
    return orig.call(this, options);
  };

  AppV2.prototype.__ignoreEscPatched = true;
  console.log("✅ Ignore-ESC active. ESC ignored for configured windows.");
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
    const { selected = [], custom = [] } = game.settings.get(MODULE_ID, "protectedClasses") || {};
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
    const selected = Array.isArray(formData.selected) ? formData.selected : [formData.selected].filter(Boolean);
    const custom = formData.custom
      ? formData.custom.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    await game.settings.set(MODULE_ID, "protectedClasses", { selected, custom });
    ui.notifications.info("Ignore-ESC: settings updated");
  }
}
