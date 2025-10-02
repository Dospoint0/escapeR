# Ignore Escape for Selected Windows

This Foundry VTT module prevents specific windows from closing when the **Escape** key is pressed.  
By default, it protects **Camera Popouts**, but you can configure other window types (Actor Sheets, Journal Sheets, Playlists, etc.) or add your own custom CSS classes.

## Features
- Prevents ESC from closing selected windows.  
- Configurable through **Module Settings → Ignore Escape → Configure**.  
- Choose from common window types via checkboxes.  
- Add custom class names for any other windows.

## Installation
1. Copy this module into your Foundry `Data/modules/` directory.  
2. Restart Foundry and enable **Ignore Escape for Selected Windows** in **Manage Modules**.  
3. Configure which windows to protect under **Configure Settings → Module Settings**.

## Usage
- Open a protected window (e.g., Camera Popout).  
- Press **Esc** → window stays open.  
- Use the window’s **X button** to close it manually.  

## License
MIT
