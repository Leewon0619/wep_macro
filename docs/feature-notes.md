# Macro Program Feature Notes (Saved)

## Scope
- Web-first implementation, with support for a browser extension as well.

## Core Features
- Keyboard input hook detection.
- Macro recording (Record).
- Save/load recorded actions to a macro file (`.m`).
- Macro execution (Run).
- Save user settings to `key_macro.ini`.

## UI Requirements
- Macro list with numbering format `Macro %d`.
- Record button/entry `Rec`.
- Edit button/entry `Edit`.

## Additional UI/Shortcut Requirements
- Basic UI includes a list to set shortcut keys for:
  - Macro run waiting
  - Edit toggle
- Shortcut keys can be assigned by pressing a key on the keyboard (key-capture assignment).

## Additional UI Control
- Provide an on/off button with:
  - On: macro run enabled
  - Off/Edit: macro run disabled + edit mode

## Clarification
- The on/off button requirement applies to the Basic UI.

## Basic UI Recording Control
- A [Record] section/button exists in the Basic UI.
- Clicking starts recording mouse/keyboard actions.
- Clicking again or pressing the assigned shortcut stops recording.
- Recording shortcut can be assigned by the user via key press capture.
